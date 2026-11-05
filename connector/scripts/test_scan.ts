import net from 'net';

async function scanSubnet(subnetPrefix = '192.168.68', port = 4370, timeoutMs = 500): Promise<string[]> {
  console.log(`[Scan] Scanning ${subnetPrefix}.1..254 on port ${port}...`);
  const start = Date.now();
  const promises: Promise<string | null>[] = [];

  for (let i = 1; i <= 254; i++) {
    const ip = `${subnetPrefix}.${i}`;
    const p = new Promise<string | null>((resolve) => {
      const sock = new net.Socket();
      sock.setTimeout(timeoutMs);
      sock.on('connect', () => {
        sock.destroy();
        resolve(ip);
      });
      sock.on('timeout', () => {
        sock.destroy();
        resolve(null);
      });
      sock.on('error', () => {
        sock.destroy();
        resolve(null);
      });
      sock.connect(port, ip);
    });
    promises.push(p);
  }

  const results = await Promise.all(promises);
  const found = results.filter((ip): ip is string => ip !== null);
  console.log(`[Scan] Done in ${Date.now() - start}ms. Found open port 4370 at:`, found);
  return found;
}

scanSubnet().catch(console.error);
