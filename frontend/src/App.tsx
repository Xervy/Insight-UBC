// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import heroImg from './assets/hero.png'
import { useState, useEffect } from 'react';
import './App.css';

type Course = {
  id: string;
  title: string;
  dept: string;
  code: string;
  links: {
    self: string;
    sections: string;
  };
};

type Section = {
  id: string;
	instructor: string;
	year: number;
	avg: number;
	pass: number;
	fail: number;
	audit: number;
	links: {
    self: string;
    course: string;
  }
}

function App() {
  return (
    <div className='background'>
      <ScrollableCourses></ScrollableCourses>
    </div>
  )
}

function ScrollableCourses() {
  const [openCourseID, setOpenCourseID] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const loadCourses = async () => {
      const res = await fetch("/api/v1/courses");
      const data = await res.json();
      console.log("DATA: ", data);
      setCourses(data.items);
    }

    loadCourses();
  }, []);

  //TODO Change from hard coded to connected to backend

  async function toggleSections(course: Course) {
    if (course.id === openCourseID) {
      setOpenCourseID(null);
      setSections([]);
    } else {
      setOpenCourseID(course.id);
      const loadedSections = await loadSections(course)
      setSections(loadedSections.items);
    }
  }

  async function loadSections(course: Course) {
    const res = await fetch(course.links.sections);
    const data = await res.json();
    console.log("did we get here?");
    console.log("Sections:", data.items)
    return data;
  }

  return (
    <div className='background'>
      <h1>Courses</h1>

      {courses.map((course) => (
        <div key={course.id} className='courses'>
          <h2>{course.title}</h2>
          <p>{course.dept}</p>

          <button onClick={async () => {await toggleSections(course);}}>
            {openCourseID === course.id ? "Hide Sections" : "Show Sections"}
          </button>

          {openCourseID === course.id && (
            <div>{sections.map((section) => (
              <div key={section.id} className='sections'>
                Section: {section.id}
              </div>
            ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}




//// USE THIS AS REFERENCE TO LEARN

// function App() {
//   const [count, setCount] = useState(0)

// return (
//   <>
//     <section id="center">
//       <div className="hero">
//         <img src={heroImg} className="base" width="170" height="179" alt="" />
//         <img src={reactLogo} className="framework" alt="React logo" />
//         <img src={viteLogo} className="vite" alt="Vite logo" />
//       </div>
//       <div>
//         <h1>Get started</h1>
//         <p>
//           Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
//         </p>
//       </div>
//       <button
//         type="button"
//         className="counter"
//         onClick={() => setCount((count) => count + 1)}
//       >
//         Count is {count}
//       </button>
//     </section>

//     <div className="ticks"></div>

//     <section id="next-steps">
//       <div id="docs">
//         <svg className="icon" role="presentation" aria-hidden="true">
//           <use href="/icons.svg#documentation-icon"></use>
//         </svg>
//         <h2>Documentation</h2>
//         <p>Your questions, answered</p>
//         <ul>
//           <li>
//             <a href="https://vite.dev/" target="_blank">
//               <img className="logo" src={viteLogo} alt="" />
//               Explore Vite
//             </a>
//           </li>
//           <li>
//             <a href="https://react.dev/" target="_blank">
//               <img className="button-icon" src={reactLogo} alt="" />
//               Learn more
//             </a>
//           </li>
//         </ul>
//       </div>
//       <div id="social">
//         <svg className="icon" role="presentation" aria-hidden="true">
//           <use href="/icons.svg#social-icon"></use>
//         </svg>
//         <h2>Connect with us</h2>
//         <p>Join the Vite community</p>
//         <ul>
//           <li>
//             <a href="https://github.com/vitejs/vite" target="_blank">
//               <svg
//                 className="button-icon"
//                 role="presentation"
//                 aria-hidden="true"
//               >
//                 <use href="/icons.svg#github-icon"></use>
//               </svg>
//               GitHub
//             </a>
//           </li>
//           <li>
//             <a href="https://chat.vite.dev/" target="_blank">
//               <svg
//                 className="button-icon"
//                 role="presentation"
//                 aria-hidden="true"
//               >
//                 <use href="/icons.svg#discord-icon"></use>
//               </svg>
//               Discord
//             </a>
//           </li>
//           <li>
//             <a href="https://x.com/vite_js" target="_blank">
//               <svg
//                 className="button-icon"
//                 role="presentation"
//                 aria-hidden="true"
//               >
//                 <use href="/icons.svg#x-icon"></use>
//               </svg>
//               X.com
//             </a>
//           </li>
//           <li>
//             <a href="https://bsky.app/profile/vite.dev" target="_blank">
//               <svg
//                 className="button-icon"
//                 role="presentation"
//                 aria-hidden="true"
//               >
//                 <use href="/icons.svg#bluesky-icon"></use>
//               </svg>
//               Bluesky
//             </a>
//           </li>
//         </ul>
//       </div>
//     </section>

//     <div className="ticks"></div>
//     <section id="spacer"></section>
//   </>
// )
// }

export default App
