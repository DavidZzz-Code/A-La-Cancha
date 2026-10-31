"""Pruebas reales de PostgreSQL con psql y conexiones independientes. Sin dependencias Python."""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import threading
import unittest
import uuid

ROOT = Path(__file__).resolve().parents[2]
PLAYER = '00000000-0000-0000-0000-000000000001'
OTHER = '00000000-0000-0000-0000-000000000002'
OWNER = '00000000-0000-0000-0000-000000000003'
OUTSIDER = '00000000-0000-0000-0000-000000000004'
COURT = '20000000-0000-0000-0000-000000000001'
SECOND = '20000000-0000-0000-0000-000000000002'
PRIVATE = '20000000-0000-0000-0000-000000000003'


def sql(query, actor=None, role=None, ok=True):
    prefix = ''
    if actor:
        prefix = f"set role authenticated; set request.jwt.claim.sub='{actor}';"
    elif role:
        assert role in ('anon', 'authenticated')
        prefix = f'set role {role};'
    result = subprocess.run(['psql', '-XqAt', '-v', 'ON_ERROR_STOP=1'], input=prefix+query,
                            text=True, capture_output=True, timeout=20, encoding='utf-8')
    if ok and result.returncode:
        raise AssertionError(result.stderr)
    if not ok and not result.returncode:
        raise AssertionError('La operación debía rechazarse: '+query)
    return result.stdout.strip() if ok else result.stderr


def create(day, time='19:00', actor=PLAYER, court=COURT, key=None, kind='player', duration=60, ok=True):
    key = key or str(uuid.uuid4())
    return sql(f"select row_to_json(r) from public.create_reservation('{court}',"
               f"(now() at time zone 'America/Bogota')::date+{day},'{time}',{duration},10,'Equipo demo','{key}','{kind}') r;",
               actor=actor, ok=ok)


class AgendaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if os.environ.get('PGDATABASE') != 'alacancha_test':
            raise RuntimeError('PGDATABASE debe ser alacancha_test. No ejecutar sobre datos existentes.')
        for path in [ROOT/'supabase/tests/bootstrap.sql', ROOT/'supabase/migrations/202610300001_agenda.sql', ROOT/'supabase/tests/seed.sql']:
            sql(path.read_text(encoding='utf-8'))

    def test_01_visibility_and_direct_writes(self):
        self.assertEqual(sql('select count(*) from public.courts;', role='anon'), '2')
        self.assertEqual(sql('select count(*) from public.courts;', actor=OUTSIDER), '3')
        self.assertEqual(sql('select count(*) from public.venue_members;', actor=PLAYER), '0')
        self.assertIn('permission denied', sql("update public.courts set hourly_price=1;", actor=OWNER, ok=False))
        self.assertIn('permission denied', sql('select * from public.reservations;', role='anon', ok=False))
        self.assertIn('authentication_required', sql(f"select public.create_reservation('{COURT}',current_date+1,'19:00',60,10,'X',gen_random_uuid());", role='authenticated', ok=False))
        self.assertIn('court_unavailable', create(1,court=PRIVATE,ok=False))

    def test_02_server_price_idempotency_and_events(self):
        key = str(uuid.uuid4())
        first = json.loads(create(2,duration=90,key=key))
        self.assertEqual(first['total'],150002)
        self.assertEqual(first['status'],'held')
        self.assertEqual(first['id'],json.loads(create(2,duration=90,key=key))['id'])
        self.assertIn('idempotency_mismatch',create(2,duration=60,key=key,ok=False))
        self.assertEqual(sql(f"select count(*) from public.reservation_events where reservation_id='{first['id']}';",actor=PLAYER),'1')
        self.assertEqual(sql(f"select count(*) from public.reservations where id='{first['id']}';",actor=OTHER),'0')
        self.assertEqual(sql(f"select count(*) from public.reservation_events where reservation_id='{first['id']}';",actor=OTHER),'0')
        self.assertEqual(sql(f"select count(*) from public.reservations where id='{first['id']}';",actor=OWNER),'1')

    def test_03_simultaneous_connections_only_one_wins(self):
        barrier = threading.Barrier(2)
        def attempt(actor):
            barrier.wait(timeout=5)
            try: return ('ok',json.loads(create(3,actor=actor)))
            except AssertionError as error: return ('rejected',str(error))
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(attempt,[PLAYER,OTHER]))
        self.assertEqual(sum(status=='ok' for status,_ in results),1,results)
        rejection = next(value for status,value in results if status=='rejected')
        self.assertIn('exclusion constraint',rejection)
        self.assertEqual(sql("select count(*) from public.reservations where (starts_at at time zone 'America/Bogota')::date=(now() at time zone 'America/Bogota')::date+3;"),'1')

    def test_04_owner_confirmation_and_cancel_release(self):
        held = json.loads(create(4))
        identifier = held['id']
        query = f"select status from public.transition_reservation('{identifier}','confirmed');"
        self.assertIn('owner_required',sql(query,actor=PLAYER,ok=False))
        self.assertIn('reservation_unavailable',sql(query,actor=OUTSIDER,ok=False))
        self.assertEqual(sql(query,actor=OWNER),'confirmed')
        self.assertEqual(sql(f"select status from public.transition_reservation('{identifier}','cancelled','Cambio de plan demo');",actor=PLAYER),'cancelled')
        self.assertEqual(json.loads(create(4))['status'],'held')
        self.assertEqual(sql(f"select count(*) from public.reservation_events where reservation_id='{identifier}';",actor=PLAYER),'3')

    def test_05_expiry_cannot_confirm_and_is_reclaimed(self):
        held = json.loads(create(5))
        sql(f"update public.reservations set expires_at=now()-interval '1 second' where id='{held['id']}';")
        self.assertIn('invalid_transition',sql(f"select public.transition_reservation('{held['id']}','confirmed');",actor=OWNER,ok=False))
        self.assertEqual(sql(f"select count(*) from public.occupied_slots('{COURT}',(now() at time zone 'America/Bogota')::date+5);",role='anon'),'0')
        create(5,actor=OTHER)
        self.assertEqual(sql(f"select status from public.reservations where id='{held['id']}';",actor=PLAYER),'expired')

    def test_06_external_and_blocks_share_inventory(self):
        self.assertIn('owner_required',create(6,kind='external',ok=False))
        booking = json.loads(create(6,kind='external',actor=OWNER))
        self.assertEqual(booking['status'],'confirmed')
        self.assertIn('exclusion constraint',create(6,ok=False))
        block = json.loads(create(6,time='21:00',kind='block',actor=OWNER))
        self.assertEqual(block['total'],0)
        self.assertIn('exclusion constraint',create(6,time='21:00',ok=False))
        self.assertEqual(json.loads(create(6,court=SECOND))['status'],'held')

    def test_07_adjacent_and_closing_boundary(self):
        create(7,time='21:00')
        last = json.loads(create(7,time='22:00'))
        self.assertEqual(sql(f"select starts_at at time zone 'America/Bogota' from public.reservations where id='{last['id']}';",actor=PLAYER).split(' ')[1],'22:00:00')
        self.assertIn('invalid_slot',create(7,time='22:30',ok=False))
        self.assertIn('invalid_input',create(7,time='19:15',ok=False))
        self.assertIn('invalid_slot',create(31,ok=False))
        self.assertIn('invalid_slot',create(-1,ok=False))

    def test_08_database_constraint_survives_rpc_bypass(self):
        reservation = json.loads(create(8))
        query = f"""insert into public.reservations(court_id,actor_id,kind,status,starts_at,ends_at,team,players,total,idempotency_key)
          select court_id,actor_id,'external','confirmed',starts_at,ends_at,'Intento directo',10,1,gen_random_uuid()
          from public.reservations where id='{reservation['id']}';"""
        self.assertIn('exclusion constraint',sql(query,ok=False))


if __name__ == '__main__':
    unittest.main(verbosity=2)
