export type Data = {
	course_offerings: Course[];
	facilities: Building[];
}

export type Course = {
	id: string;
	title: string;
	dept: string;
	code: string;
	sections: Section[];
	[k: string]: any;
};

export type Section = {
	id: string;
	instructor: string;
	year: number;
	avg: number;
	pass: number;
	fail: number;
	audit: number;
	[k: string]: any;
};

export type Building = {
	id: string;
	name: string;
	address: string;
	lat: number;
	lon: number;
	rooms: Room[];
};

export type Room = {
	id: string;
	building: string;
	number: string;
	type: string;
	furniture: string;
	href: string;
	seats: number;
};

export type Offering = {
	id: number;
	Course: string;
	Title: string;
	Professor: string;
	Subject: string;
	Section: string;
	Year: string;
	Avg: number;
	Pass: number;
	Fail: number;
	Audit: number;
};
export type Upload = {
	id: string;
	status: "processing" | "completed" | "failed";
	kind: string;
	stats?: Record<string, number>;
	message?: string;
};

export type UploadStats = UploadOfferingStats | UploadFacilityStats;

export type UploadOfferingStats = {
	id: string;
	status: "processing" | "completed" | "failed";
	kind: "course_offerings";
	stats: {
		files_total: number;
		files_processed: number;
		files_skipped: number;
		courses_seen: number;
		courses_added: number;
		courses_modified: number;
		sections_seen: number;
		sections_added: number;
		sections_modified: number;
	}
	message: string;
};

export type UploadFacilityStats = {
	id: string;
	status: "processing" | "completed" | "failed";
	kind: "facilities";
	stats: {
		buildings_added: number;
		buildings_modified: number;
		rooms_added: number;
		rooms_modified: number;
	}
	message: string;
}

export type UploadObject = {
	id: number;
	Course: string;
	Title: string;
	Professor: string;
	Subject: string;
	Section: string;
	Year: string;
	Avg: number;
	Pass: number;
	Fail: number;
	Audit: number;
};

export type SearchRequestBody = {
	kind: string;
	query: {
		WHERE: Comparator;
		OPTIONS: SearchRequestBodyOptions;
		TRANSFORMATIONS?: SearchRequestBodyTransformations; 
	};
};

export type SearchRequestBodyOptions = {
	COLUMNS: (MFieldOffering & SFieldOffering)[];
	ORDER?: string | SearchRequestBodyOptionsOrder;
};

export type SearchRequestBodyOptionsOrder = {
	dir: "UP" | "DOWN";
	keys: string[]
}

export type SearchRequestBodyTransformations = {
	GROUP: MathStringField[];
	APPLY: ApplyRule[];
}

export type ApplyRule = {
	[key in string]: {
		[key in ApplyToken]: MathStringField;
	}
}

export type ApplyToken = "MAX" | "MIN" | "AVG" | "COUNT" | "SUM";

// export type SearchColumnDataS = {
// 	[key in SField]?: string;
// }

// export type SearchColumnDataM = {
// 	[key in MField]?: number;
// }

// export type SearchColumnData = SearchColumnDataM & SearchColumnDataS;

export type Comparator = LogicalComparator | MFieldComparatorOffering | SFieldComparatorOffering | MFieldComparatorFacility | SFieldComparatorFacility | NegationComparator;

export type LogicalComparator = {
	[key in "AND" | "OR"]?: Comparator[];
};

export type MFieldComparatorOffering = {
	[key in "LT" | "GT" | "EQ"]?: {
		[key in MFieldOffering]?: number;
	};
};

export type SFieldComparatorOffering = {
	[key in "IS"]?: {
		[key in SFieldOffering]?: string;
	};
};

export type MFieldComparatorFacility = {
	[key in "LT" | "GT" | "EQ"]?: {
		[key in MFieldFacility]?: number;
	};
};

export type SFieldComparatorFacility = {
	[key in "IS"]?: {
		[key in SFieldFacility]?: string;
	};
};

export type NegationComparator = {
	[key in "NOT"]?: Comparator;
};

export type MathStringField = MFieldFacility | MFieldOffering | SFieldFacility | SFieldOffering;

export const MFieldArrOffering = ["avg", "pass", "fail", "audit", "year"];
export const SFieldArrOffering = ["title", "dept", "code", "instructor"];

export const MFieldArrFacility = ["lat", "lon", "seats"];
export const SFieldArrFacility = ["address", "building", "furniture", "href", "name", "number", "type"];

export type MFieldOffering = (typeof MFieldArrOffering)[number];
export type SFieldOffering = (typeof SFieldArrOffering)[number];

export type MFieldFacility = (typeof MFieldArrFacility)[number];
export type SFieldFacility = (typeof SFieldArrFacility)[number];

export class SearchEBNFError extends Error {
	constructor(msg: string) {
		super(msg);
	}
}
