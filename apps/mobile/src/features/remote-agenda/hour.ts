export function hourLabel(clock:string, offset=0){
 const [hour,minute]=clock.split(':').map(Number);
 const total=(hour*60+minute+offset)%1440;
 const h=Math.floor(total/60);
 return (h%12||12)+':'+String(total%60).padStart(2,'0')+(h<12?' a. m.':' p. m.');
}
