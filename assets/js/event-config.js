/* PI Champion Season 2 — event configuration shared by the browser app and the live server.
 * Edit criteria, weights and the starting team list here only.
 */
(function (root) {
  'use strict';
  const FINAL = [
    {id:'pain_point',name:'Pain Point',weight:10,icon:'warning',description:'ระบุ Pain Point ได้ชัดเจน'},
    {id:'process_alignment',name:'Process Alignment',weight:20,icon:'layers',description:'กระบวนการที่ปรับเปลี่ยนสอดคล้องกับวัตถุประสงค์'},
    {id:'innovation',name:'Innovation',weight:15,icon:'spark',description:'ความคิดสร้างสรรค์ / นวัตกรรม'},
    {id:'ai_rpa_tools',name:'AI / RPA / Tools',weight:15,icon:'cpu',description:'แนวทางการใช้ AI / RPA หรือ Tools อื่น ๆ'},
    {id:'presentation_qa',name:'Presentation & Q&A',weight:20,icon:'screen',description:'การนำเสนอและการตอบคำถาม'},
    {id:'benefits',name:'Benefits',weight:20,icon:'trend',description:'ประโยชน์ที่ได้รับ'},
  ];
  const DEMO = [
    {id:'pain_point',name:'Pain Point',weight:10,description:'ระบุ Pain Point ได้ชัดเจน'},
    {id:'process_approach',name:'Process & Approach',weight:20,description:'ระบุที่มาของกระบวนการและแนวทางในการปรับเปลี่ยนกระบวนการ'},
    {id:'results',name:'Results',weight:30,description:'ความสมบูรณ์ของโปรแกรมและผลลัพธ์ที่เกิดขึ้นจริง'},
    {id:'innovation',name:'Innovation',weight:20,description:'ความคิดสร้างสรรค์ / นวัตกรรม'},
    {id:'benefits',name:'Benefits',weight:20,description:'ประโยชน์ที่ได้รับ'},
  ];
  const TEAM_NAMES = ['CG#9','FI Navigator','Proxy Voting Process','Security Analysis','D.A.W.N.','Automate Testing','WealthPlus 360°','Smart Fund Launch','PAM Audit & Non-compliance Detection Automation (PANDA)','InsAIght','Smart mail IRS','KAdvisor'];
  const config = Object.freeze({ FINAL, DEMO, TEAM_NAMES, DEFAULT_DEMO_WEIGHT: 20 });
  if (typeof module === 'object' && module.exports) module.exports = config;
  else root.PI_CONFIG = config;
})(typeof window !== 'undefined' ? window : globalThis);
