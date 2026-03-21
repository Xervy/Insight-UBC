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

export type UploadStats = {
	id: string;
	status: string;
	kind: string;
	message: string;
	files_total: number;
	files_processed: number;
	files_skipped: number;
	courses_seen: number;
	courses_added: number;
	courses_modified: number;
	sections_seen: number;
	sections_added: number;
	sections_modified: number;
};

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
	};
};

export type SearchRequestBodyOptions = {
	COLUMNS: (MField & SField)[];
	ORDER?: string;
};

// export type SearchColumnDataS = {
// 	[key in SField]?: string;
// }

// export type SearchColumnDataM = {
// 	[key in MField]?: number;
// }

// export type SearchColumnData = SearchColumnDataM & SearchColumnDataS;

export type Comparator = LogicalComparator | MFieldComparator | SFieldComparator | NegationComparator;

export type LogicalComparator = {
	[key in "AND" | "OR"]?: Comparator[];
};

export type MFieldComparator = {
	[key in "LT" | "GT" | "EQ"]?: {
		[key in MField]?: number;
	};
};

export type SFieldComparator = {
	[key in "IS"]?: {
		[key in SField]?: string;
	};
};

export type NegationComparator = {
	[key in "NOT"]?: Comparator;
};

export const MFieldArr = ["avg", "pass", "fail", "audit", "year"];
export const SFieldArr = ["title", "dept", "code", "instructor"];

export type MField = (typeof MFieldArr)[number];

export type SField = (typeof SFieldArr)[number];

export class SearchEBNFError extends Error {
	constructor(msg: string) {
		super(msg);
	}
}
