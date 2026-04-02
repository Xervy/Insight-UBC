export function RetrieveAllQueryError(limit: any, offset: any): GetBuildingsErrorObject | boolean {
	const errorMessage = {
		error: "Invalid request parameters",
		params: {} as any,
	};
	let isError = false;

	if (isNaN(limit)) {
		limit = 100;
	}
	if (limit < 1 || limit > 5000) {
		errorMessage.params["limit"] = "expected an integer between 1 and 5000";
		isError = true;
	}
	if (isNaN(offset)) {
		offset = 0;
	}
	if (offset < 0) {
		errorMessage.params["offset"] = "expected an integer >= 0";
		isError = true;
	}

	if (isError) {
		return errorMessage;
	}
	return isError;
}

export type GetBuildingsErrorObject = {
	error: string;
	params: any;
};
