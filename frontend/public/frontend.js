import res from "../../jszip";

document.addEventListener('DOMContentLoaded', async function() {
	// once the DOM is loaded, attach an onclick handler to the button
	document.getElementById("click-me-button").addEventListener("click", handleClickMe);
	document.getElementById("uploadButton")?.addEventListener("click", uploadFile);
	document.addEventListener("displayTable", async () => {
		try {
			await loadTable();
		} catch (e) {
			console.error(e);
		}
	}); //ChatGPT


	function setStatus(status) {
		const currStatus = byId("status");
		if (currStatus) currStatus.textContent = status;
	}

	function sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	} //ChatGPT


	async function uploadFile() {
		const zipFile = document.getElementById("zipFile");
		const file = zipFile.files[0];
		if (!file) {
			setStatus("no zip file");
			return;
		}
		try {
			setStatus("processing");
			const form = new FormData();
			form.append("kind", "course_offerings");
			form.append("archive", file);
			const data = await fetch("/api/v1/datasets", {
				method: "POST",
				body: form
			});
			if (!data.ok) {
				new Error("Failed to upload");
			}
			const uploadJob = await data.json();
			setStatus("processing");
			await pollData(uploadJob.id);
		} catch (error) {
			setStatus("error" + err.message);
		}
	}


	async function pollData(dataId) {
		while (true) {
			const data = await fetch(`/api/v1/datasets/${dataId}`, {
				method: "GET",
			});
			if (!data.ok) {
				setStatus("failed to get status");
				return;
			}
			const upload = await data.json();

			if (upload.status === "processing") {
				setStatus("processing");
				await sleep(1000);
				continue;
			}
			if (upload.status === "completed") {
				setStatus("completed");
				showResult(upload);
				return;
			}

			if (upload.status === "failed") {
				setStatus("failed");
				showResult(upload);
				return;
			}
			setStatus(`Unknown status ${job.status}`);
			return;
		}
	}

	function showResult(data) {
		const result = document.getElementById("result");
		result.textContent = JSON.stringify(data, null, 2);
	}

	const COLUMNS = ["dept", "code", "title", "year", "instructor", "avg"];

	async function loadTable() {
		const body = {
			kind: "course_offerings",
			query: {
				WHERE: {},
				OPTIONS: {
					COLUMNS: COLUMNS
				}
			}
		};

		const result = await fetch("/api/v1/search", {
			method: "POST",
			headers: {"Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!result.ok) {
			if (result.status === 413) {
			throw new Error("Too many results");
		}
			const error = await result.text();
			throw new Error(error || 'Search failed: ${result.status}');
		}
		const rows = await result.json();
		renderTable(rows);

	}

	function renderTable(rows) {
		const table = document.getElementById("table");
		table.innerHTML="";
		for (const row of rows) {
			const x = document.createElement("x");
			for (const key in COLUMNS) {
				const y = document.createElement("y");
				y.textContent = row[key]!= null ? String(row[key]) : "";
				x.appendChild(y); //ChatGPT
			}
			table.appendChild(y);
		}
	}

	async function handleClickMe() {
		// create a new paragraph tag: <p></p>
		const p = document.createElement("p");

		// Send a GET /api request to the server
		const res = await fetch("/api", {method: "GET"});
		if (res.ok) {
			// set the text of the paragraph to the server response if successful
			// <p>API is running!</p>
			p.textContent = await res.text();
		} else {
			// other, set the paragraph text to be the error message
			p.textContent = res.statusText;
		}
		// insert the paragraph after the <button></button> tag
		document.body.appendChild(p);
	}
})
