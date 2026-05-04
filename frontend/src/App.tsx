// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import heroImg from './assets/hero.png'
import { useState } from 'react';
import './App.css'

function App() {
  return (
    <div className='background'>
      <ScrollableCourses></ScrollableCourses>
    </div>
  )
}

function ScrollableCourses() {
  const [openCourseID, setOpenCourseID] = useState<string | null>(null);

  //TODO Change from hard coded to connected to backend
  const demoCourses = [
    {
      "id": "cpsc210",
      "title": "Object Oriented Code",
      "dept": "Computer Science",
      "code": "210",
      "sections": [
        {
          "id": "24w201",
          "instructor": "hunny, ro",
          "year": 2024,
          "avg": 64.3,
          "pass": 167,
          "fail": 3,
          "audit": 1
        },
        {
          "id": "24w202",
          "instructor": "tip, queue",
          "year": 2024,
          "avg": 64.5,
          "pass": 172,
          "fail": 1,
          "audit": 0
        }
      ]
    },
    {
      "id": "math221",
      "title": "Matrix Algebra",
      "dept": "Mathematics",
      "code": "221",
      "sections": [
        {
          "id": "25w201",
          "instructor": "dawg, p",
          "year": 2025,
          "avg": 76.3,
          "pass": 193,
          "fail": 2,
          "audit": 1
        },
        {
          "id": "25w202",
          "instructor": "jamin, bean",
          "year": 2025,
          "avg": 57.1,
          "pass": 139,
          "fail": 49,
          "audit": 7
        },
        {
          "id": "25w203",
          "instructor": "peesha, aloe",
          "year": 2025,
          "avg": 77.1,
          "pass": 179,
          "fail": 4,
          "audit": 0
        }
      ]
    },
    {
      "id": "cpsc310",
      "title": "Introduction to Software Engineering",
      "dept": "Computer Science",
      "code": "310",
      "sections": [
        {
          "id": "21w201",
          "instructor": "holmes, reid",
          "year": 2021,
          "avg": 76.4,
          "pass": 167,
          "fail": 3,
          "audit": 1
        },
        {
          "id": "21w202",
          "instructor": "bradley, nick",
          "year": 2021,
          "avg": 77.1,
          "pass": 172,
          "fail": 1,
          "audit": 0
        }
      ]
    }
  ];

  function toggleSections(id: string) {
    if (id === openCourseID) {
      setOpenCourseID(null)
    } else {
      setOpenCourseID(id);
    }
  }

  return (
    <div className='background'>
      <h1>Courses</h1>

      {demoCourses.map((course) => (
        <div key={course.id} className='courses'>
          <h2>{course.title}</h2>
          <p>{course.dept}</p>

          <button onClick={() => toggleSections(course.id)}>
            {openCourseID === course.id ? "Hide Sections" : "Show Sections"}
          </button>

          {openCourseID === course.id && (
            <div>{course.sections.map((section) => (
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
