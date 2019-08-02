export class BaseError extends Error {
    public toString(): string {
        return this.message;
    }
}
