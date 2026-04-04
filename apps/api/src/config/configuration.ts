export const configuration = () => ({
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  database: {
    url: process.env['DATABASE_URL'] ?? '',
  },
  cognito: {
    region: process.env['COGNITO_REGION'] ?? '',
    userPoolId: process.env['COGNITO_USER_POOL_ID'] ?? '',
    clientId: process.env['COGNITO_CLIENT_ID'] ?? '',
  },
});

export type AppConfig = ReturnType<typeof configuration>;
