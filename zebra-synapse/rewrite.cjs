const fs = require('fs');

let content = fs.readFileSync('src/app/pages/doctor/PatientsList.tsx', 'utf-8');

// Find sections
const heroStart = content.indexOf('{/* Hero Card ("Visits for Today") */}');
const patientListStart = content.indexOf('{/* Right: Patient List Queue */}');
const bottomGridStart = content.indexOf('{/* Bottom 2-Column Section: Consultation Center | Daily Read */}');
const consultationStart = content.indexOf('{/* Center: Consultation Inspection Panel */}');
const dailyReadStart = content.indexOf('{/* Right: Daily Read / Medical Intelligence Card */}');
const modalStart = content.indexOf('{/* Modal for Daily Read Article */}');

const heroContent = content.substring(heroStart, patientListStart);
const patientListContent = content.substring(patientListStart, bottomGridStart);
const consultationContent = content.substring(consultationStart, dailyReadStart);
const dailyReadContent = content.substring(dailyReadStart, modalStart);

// Clean up wrappers in the extracted contents
// Hero content starts with `<div className="lg:col-span-7 xl:col-span-8 relative...`
// Change it to `<div className="relative overflow-hidden shrink-0 rounded-[26px] bg-gradient-to-br from-[#A8DEF7] via-[#D8D9FF] to-[#C7D2FE] p-6 md:p-8 flex flex-col justify-between shadow-lg shadow-[#3E36B0]/5 border border-white/80">`
let newHero = heroContent.replace(
  'className="lg:col-span-7 xl:col-span-8 relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#A8DEF7] via-[#D8D9FF] to-[#C7D2FE] p-6 md:p-8 flex flex-col justify-between shadow-lg shadow-[#3E36B0]/5 border border-white/80"',
  'className="relative overflow-hidden shrink-0 rounded-[26px] bg-gradient-to-br from-[#A8DEF7] via-[#D8D9FF] to-[#C7D2FE] p-6 md:p-8 flex flex-col justify-between shadow-lg shadow-[#3E36B0]/5 border border-white/80"'
);

// patientListContent starts with `<div className="lg:col-span-5 xl:col-span-4 bg-white rounded-[26px] p-5 shadow-sm border border-slate-200/70 flex flex-col h-[560px]">`
let newPatientList = patientListContent.replace(
  'className="lg:col-span-5 xl:col-span-4 bg-white rounded-[26px] p-5 shadow-sm border border-slate-200/70 flex flex-col h-[560px]"',
  'className="bg-white rounded-[26px] p-5 shadow-sm border border-slate-200/70 flex flex-col flex-1 min-h-0"'
);

// consultationContent starts with `<div className="lg:col-span-8 xl:col-span-8 bg-white rounded-[26px] p-5 md:p-6 shadow-sm border border-slate-200/70 flex flex-col justify-between min-h-[560px]">`
let newConsultation = consultationContent.replace(
  'className="lg:col-span-8 xl:col-span-8 bg-white rounded-[26px] p-5 md:p-6 shadow-sm border border-slate-200/70 flex flex-col justify-between min-h-[560px]"',
  'className="bg-white rounded-[26px] p-5 md:p-6 shadow-sm border border-slate-200/70 flex flex-col justify-between flex-1 min-h-0 overflow-y-auto [scrollbar-width:thin]"'
);

// dailyReadContent starts with `<div className="lg:col-span-4 xl:col-span-4 bg-white rounded-[26px] p-5 shadow-sm border border-slate-200/70 flex flex-col justify-between h-[560px]">`
let newDailyRead = dailyReadContent.replace(
  'className="lg:col-span-4 xl:col-span-4 bg-white rounded-[26px] p-5 shadow-sm border border-slate-200/70 flex flex-col justify-between h-[560px]"',
  'className="bg-white rounded-[26px] p-5 shadow-sm border border-slate-200/70 flex flex-col justify-between shrink-0"'
);

// Reconstruct layout
const beforeGrid = content.substring(0, content.indexOf('<div className="space-y-5 pb-8 font-poppins">'));
const afterGrid = content.substring(modalStart);

const newLayout = `
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-full min-h-0 font-poppins pb-2">
      {/* Left Column: Hero & Consultation */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5 h-full min-h-0">
        ${newHero}
        ${newConsultation}
      </div>

      {/* Right Column: Patient List & Daily Read */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5 h-full min-h-0">
        ${newPatientList}
        ${newDailyRead}
      </div>
    </div>
      `;

const finalContent = beforeGrid + newLayout + afterGrid;

fs.writeFileSync('src/app/pages/doctor/PatientsList.tsx', finalContent);
console.log("Rewritten successfully.");
