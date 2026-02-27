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
