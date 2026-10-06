import { createLoggerStorage } from 'evlog/toolkit';

const { storage } = createLoggerStorage('request context. Make sure the evlog middleware is registered on the root route.');

export { storage };
