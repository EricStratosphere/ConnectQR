export async function getNetworkAddress() {
  const response = await fetch('https://ifconfig.me/all.json');

  if (!response.ok) {
    throw new Error(`Failed to fetch network address: ${response.status}`);
  }

  const body = await response.json();

  return body?.ip_addr ?? null;
}
