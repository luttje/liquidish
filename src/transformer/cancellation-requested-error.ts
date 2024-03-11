export class CancellationRequestedError extends Error {
    constructor() {
        super('Cancellation requested');
        this.name = 'CancellationRequestedError';

        // Manually set the prototype, ensuring the prototype chain is correct
        Object.setPrototypeOf(this, CancellationRequestedError.prototype);
    }
}
