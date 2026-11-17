// Run only for hosting builds. Local development can still run without AWS.
const required = [
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID',
  'NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID',
  'NEXT_PUBLIC_IMAGE_BASE_URL',
];
const invalid = required.filter(name => !process.env[name]?.trim());
for (const name of ['NEXT_PUBLIC_API_BASE_URL', 'NEXT_PUBLIC_IMAGE_BASE_URL']) {
  try {
    const url = new URL(process.env[name]);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) invalid.push(name);
  } catch { invalid.push(name); }
}
if (invalid.length) {
  console.error('Configure as variáveis de alojamento: ' + [...new Set(invalid)].join(', '));
  process.exit(1);
}
console.log('Variáveis públicas de alojamento verificadas.');
