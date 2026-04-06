export class RESTfulError extends Error {
    status: number;
    details?: any;

	constructor(status: number, msg: string, details: any) {
		super(msg);
        this.status = status;
        this.details = details;
	}
}