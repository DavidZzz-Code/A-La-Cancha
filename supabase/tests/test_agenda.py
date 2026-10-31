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
        assert role in ('anon', 'authenticated', 'service_role')
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
        migrations = sorted((ROOT/'supabase/migrations').glob('*.sql'))
        for path in [ROOT/'supabase/tests/bootstrap.sql', migrations[0], ROOT/'supabase/tests/seed.sql']:
            sql(path.read_text(encoding='utf-8'))
        # Verifica el upgrade sobre datos del esquema anterior, no solo una base vacía.
        historical = json.loads(create(1))
        for path in migrations[1:]:
            sql(path.read_text(encoding='utf-8'))
        migrated = json.loads(sql(f"select row_to_json(r) from public.reservations r where id='{historical['id']}';"))
        if (migrated['total'],migrated['base_price'],migrated['discount'],migrated['deposit']+migrated['balance']) != (historical['total'],historical['total'],0,historical['total']):
            raise AssertionError('La migración alteró el total histórico o produjo un desglose inconsistente.')

    def setUp(self):
        sql('truncate public.reservations restart identity cascade; truncate public.promotions cascade;')

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
        query = f"""insert into public.reservations(court_id,actor_id,kind,status,starts_at,ends_at,team,players,total,idempotency_key,base_price,discount,deposit,balance)
          select court_id,actor_id,'external','confirmed',starts_at,ends_at,'Intento directo',10,total,gen_random_uuid(),base_price,discount,deposit,balance
          from public.reservations where id='{reservation['id']}';"""
        self.assertIn('exclusion constraint',sql(query,ok=False))

    def promotion(self, capacity=10):
        return sql(f"""insert into public.promotions(court_id,title,percent,valid_from,valid_until,weekdays,from_minute,until_minute,max_uses,enabled)
          values('{COURT}','Oferta ficticia',20,(now() at time zone 'America/Bogota')::date,
            (now() at time zone 'America/Bogota')::date+10,array[0,1,2,3,4,5,6],420,960,{capacity},true) returning id;""")

    def test_09_quote_snapshot_and_promotion_boundaries(self):
        promotion = self.promotion()
        query = f"select row_to_json(q) from public.quote_slot('{COURT}',(now() at time zone 'America/Bogota')::date+1,'15:00',60) q;"
        price = json.loads(sql(query,role='anon'))
        self.assertEqual((price['base_price'],price['discount'],price['total'],price['deposit'],price['balance']),(100001,20000,80001,24000,56001))
        self.assertEqual(price['discount_funder'],'venue')
        key = str(uuid.uuid4())
        reservation = json.loads(create(1,time='15:00',key=key))
        self.assertEqual(reservation['promotion_id'],promotion)
        self.assertEqual(reservation['total'],price['total'])
        self.assertEqual(json.loads(create(2,time='15:30'))['discount'],0)
        self.assertEqual(json.loads(create(11,time='12:00'))['discount'],0)
        sql(f"update public.promotions set title='Nueva versión',percent=10 where id='{promotion}';")
        repeated = json.loads(create(1,time='15:00',key=key))
        self.assertEqual(repeated['total'],80001)
        self.assertEqual(repeated['promotion_title'],'Oferta ficticia')
        self.assertIn('permission denied',sql("update public.promotions set percent=99;",actor=OWNER,ok=False))

    def test_10_last_promotion_use_is_atomic_and_cancel_releases(self):
        self.promotion(capacity=1)
        barrier = threading.Barrier(2)
        def attempt(data):
            actor,time = data
            barrier.wait(timeout=5)
            return json.loads(create(1,time=time,actor=actor))
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(attempt,[(PLAYER,'12:00'),(OTHER,'13:00')]))
        self.assertEqual(sorted(r['discount'] for r in results),[0,20000])
        discounted = next(r for r in results if r['discount'])
        sql(f"select public.transition_reservation('{discounted['id']}','cancelled','Prueba de cupo');",actor=discounted['actor_id'])
        self.assertEqual(json.loads(create(1,time='14:00'))['discount'],20000)

    def test_11_active_hold_limit_across_courts_is_atomic(self):
        create(1,time='19:00')
        create(1,time='21:00')
        barrier = threading.Barrier(2)
        def attempt(court):
            barrier.wait(timeout=5)
            try: return ('ok',json.loads(create(2,court=court)))
            except AssertionError as error: return ('rejected',str(error))
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(attempt,[COURT,SECOND]))
        self.assertEqual(sum(status=='ok' for status,_ in results),1,results)
        self.assertIn('hold_limit_reached',next(value for status,value in results if status=='rejected'))
        self.assertEqual(sql("select count(*) from public.reservations where status='held';",actor=PLAYER),'3')

    def test_12_expiration_maintenance_is_restricted_and_audited(self):
        reservation = json.loads(create(1))
        sql(f"update public.reservations set expires_at=now()-interval '1 second' where id='{reservation['id']}';")
        self.assertIn('permission denied',sql('select public.expire_holds();',actor=OWNER,ok=False))
        self.assertIn('permission denied',sql('select public.expire_holds();',role='anon',ok=False))
        self.assertEqual(sql('select public.expire_holds();',role='service_role'),'1')
        self.assertEqual(sql('select public.expire_holds();',role='service_role'),'0')
        self.assertEqual(sql(f"select status from public.reservations where id='{reservation['id']}';",actor=PLAYER),'expired')
        self.assertEqual(sql(f"select count(*) from public.reservation_events where reservation_id='{reservation['id']}';",actor=PLAYER),'2')

    def test_13_weekday_and_expired_promotion_use(self):
        promotion = self.promotion(capacity=1)
        sql(f"update public.promotions set weekdays=array[(extract(dow from (now() at time zone 'America/Bogota')::date+1)::integer+1)%7] where id='{promotion}';")
        query = f"select discount from public.quote_slot('{COURT}',(now() at time zone 'America/Bogota')::date+1,'12:00',60);"
        self.assertEqual(sql(query,role='anon'),'0')
        sql(f"update public.promotions set weekdays=array[0,1,2,3,4,5,6] where id='{promotion}';")
        first = json.loads(create(1,time='12:00'))
        self.assertEqual(sql(query,role='anon'),'0')
        sql(f"update public.reservations set expires_at=now()-interval '1 second' where id='{first['id']}';")
        self.assertEqual(sql(query,role='anon'),'20000')
        self.assertEqual(json.loads(create(1,time='12:00',actor=OTHER))['discount'],20000)


if __name__ == '__main__':
    unittest.main(verbosity=2)
