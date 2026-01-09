import { installProcessHandlers } from '../src/error-handling';

describe('installProcessHandlers', () => {
  const originalProcessOn = process.on.bind(process);
  const registeredHandlers: Map<string, Function[]> = new Map();

  beforeEach(() => {
    registeredHandlers.clear();
    // Mock process.on to capture registered handlers
    process.on = jest.fn((event: string, handler: Function) => {
      const handlers = registeredHandlers.get(event) || [];
      handlers.push(handler);
      registeredHandlers.set(event, handlers);
      return process;
    }) as typeof process.on;
  });

  afterEach(() => {
    process.on = originalProcessOn;
  });

  it('should register uncaughtException handler', () => {
    installProcessHandlers();
    expect(registeredHandlers.has('uncaughtException')).toBe(true);
  });

  it('should register unhandledRejection handler', () => {
    installProcessHandlers();
    expect(registeredHandlers.has('unhandledRejection')).toBe(true);
  });

  it('should not register shutdown handlers if onShutdown not provided', () => {
    installProcessHandlers();
    expect(registeredHandlers.has('SIGTERM')).toBe(false);
    expect(registeredHandlers.has('SIGINT')).toBe(false);
  });

  it('should register SIGTERM and SIGINT handlers when onShutdown provided', () => {
    installProcessHandlers({
      onShutdown: async () => {},
    });
    expect(registeredHandlers.has('SIGTERM')).toBe(true);
    expect(registeredHandlers.has('SIGINT')).toBe(true);
  });

  it('should register custom shutdown signals', () => {
    installProcessHandlers({
      onShutdown: async () => {},
      shutdownSignals: ['SIGHUP'],
    });
    expect(registeredHandlers.has('SIGHUP')).toBe(true);
    expect(registeredHandlers.has('SIGTERM')).toBe(false);
    expect(registeredHandlers.has('SIGINT')).toBe(false);
  });

  it('should call onUncaughtException callback when exception handler fires', () => {
    const onUncaughtException = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    installProcessHandlers({ onUncaughtException });

    const handler = registeredHandlers.get('uncaughtException')?.[0];
    expect(handler).toBeDefined();

    const testError = new Error('Test error');
    handler!(testError);

    expect(onUncaughtException).toHaveBeenCalledWith(testError);
    consoleSpy.mockRestore();
  });

  it('should call onUnhandledRejection callback when rejection handler fires', () => {
    const onUnhandledRejection = jest.fn();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    installProcessHandlers({ onUnhandledRejection });

    const handler = registeredHandlers.get('unhandledRejection')?.[0];
    expect(handler).toBeDefined();

    const testReason = 'Test rejection reason';
    handler!(testReason);

    expect(onUnhandledRejection).toHaveBeenCalledWith(testReason);
    consoleSpy.mockRestore();
  });
});
