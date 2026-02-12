/* state.js — QC Lab Registry: Machines, Tests, Westgard Rules, Working Days */

const STORAGE_KEY = 'qclab_data';

const state = {
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
  machines: [],
  readings: {},  // "MACHINE|TEST|LEVEL|YYYY-MM-DD": {value,time,method,operator,notes,status}
};

/* ══════ DEFAULT MACHINES & TESTS ══════ */
const DEFAULT_MACHINES = [
  {
    id:'CDR', name:'Cell-Dyne Ruby', type:'Ematologia', color:'#2980b9', icon:'🩸',
    calLot:'CAL-CDR-2026', calExpiry:'2026-12-31',
    tests:[
      {id:'WBC',name:'WBC',unit:'10³/µL',active:true,levels:[{lv:1,name:'Basso',mean:3.5,sd:0.35,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:7.2,sd:0.50,lot:'QC-CDR-L2'},{lv:3,name:'Alto',mean:15.0,sd:1.05,lot:'QC-CDR-L3'}]},
      {id:'RBC',name:'RBC',unit:'10⁶/µL',active:true,levels:[{lv:1,name:'Basso',mean:3.0,sd:0.15,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:4.5,sd:0.20,lot:'QC-CDR-L2'},{lv:3,name:'Alto',mean:6.2,sd:0.30,lot:'QC-CDR-L3'}]},
      {id:'HGB',name:'Emoglobina',unit:'g/dL',active:true,levels:[{lv:1,name:'Basso',mean:8.5,sd:0.35,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:13.5,sd:0.45,lot:'QC-CDR-L2'},{lv:3,name:'Alto',mean:18.0,sd:0.60,lot:'QC-CDR-L3'}]},
      {id:'HCT',name:'Ematocrito',unit:'%',active:true,levels:[{lv:1,name:'Basso',mean:25.0,sd:1.2,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:40.0,sd:1.5,lot:'QC-CDR-L2'},{lv:3,name:'Alto',mean:55.0,sd:2.0,lot:'QC-CDR-L3'}]},
      {id:'MCV',name:'MCV',unit:'fL',active:true,levels:[{lv:1,name:'Basso',mean:70.0,sd:2.0,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:88.0,sd:2.5,lot:'QC-CDR-L2'},{lv:3,name:'Alto',mean:105.0,sd:3.0,lot:'QC-CDR-L3'}]},
      {id:'MCH',name:'MCH',unit:'pg',active:true,levels:[{lv:1,name:'Basso',mean:24.0,sd:1.0,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:30.0,sd:1.2,lot:'QC-CDR-L2'},{lv:3,name:'Alto',mean:36.0,sd:1.5,lot:'QC-CDR-L3'}]},
      {id:'MCHC',name:'MCHC',unit:'g/dL',active:true,levels:[{lv:1,name:'Basso',mean:30.0,sd:0.8,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:33.5,sd:0.9,lot:'QC-CDR-L2'},{lv:3,name:'Alto',mean:36.5,sd:1.0,lot:'QC-CDR-L3'}]},
      {id:'PLT',name:'Piastrine',unit:'10³/µL',active:true,levels:[{lv:1,name:'Basso',mean:50.0,sd:5.0,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:230.0,sd:15.0,lot:'QC-CDR-L2'},{lv:3,name:'Alto',mean:500.0,sd:30.0,lot:'QC-CDR-L3'}]},
      {id:'RDW',name:'RDW',unit:'%',active:true,levels:[{lv:1,name:'Basso',mean:12.0,sd:0.5,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:14.0,sd:0.6,lot:'QC-CDR-L2'}]},
      {id:'MPV',name:'MPV',unit:'fL',active:true,levels:[{lv:1,name:'Basso',mean:7.0,sd:0.5,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:9.5,sd:0.6,lot:'QC-CDR-L2'}]},
      {id:'NEUT',name:'Neutrofili %',unit:'%',active:false,levels:[{lv:1,name:'Basso',mean:30.0,sd:3.0,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:60.0,sd:4.0,lot:'QC-CDR-L2'}]},
      {id:'LYMP',name:'Linfociti %',unit:'%',active:false,levels:[{lv:1,name:'Basso',mean:15.0,sd:2.0,lot:'QC-CDR-L1'},{lv:2,name:'Normale',mean:30.0,sd:3.0,lot:'QC-CDR-L2'}]},
      {id:'MONO',name:'Monociti %',unit:'%',active:false,levels:[{lv:1,name:'Normale',mean:7.0,sd:1.5,lot:'QC-CDR-L1'}]},
      {id:'EOS',name:'Eosinofili %',unit:'%',active:false,levels:[{lv:1,name:'Normale',mean:3.0,sd:1.0,lot:'QC-CDR-L1'}]},
      {id:'BASO',name:'Basofili %',unit:'%',active:false,levels:[{lv:1,name:'Normale',mean:0.5,sd:0.3,lot:'QC-CDR-L1'}]},
    ]
  },
  {
    id:'V350', name:'Vitros 350', type:'Chimica Clinica', color:'#27ae60', icon:'🧪',
    calLot:'CAL-V350-2026', calExpiry:'2026-12-31',
    tests:[
      {id:'GLU',name:'Glucosio',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:75.0,sd:3.5,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:120.0,sd:5.0,lot:'QC-V350-L2'},{lv:3,name:'Alto',mean:300.0,sd:12.0,lot:'QC-V350-L3'}]},
      {id:'UREA',name:'Urea',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:18.0,sd:1.5,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:38.0,sd:2.5,lot:'QC-V350-L2'},{lv:3,name:'Alto',mean:90.0,sd:5.0,lot:'QC-V350-L3'}]},
      {id:'CREA',name:'Creatinina',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:0.8,sd:0.05,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:1.8,sd:0.10,lot:'QC-V350-L2'},{lv:3,name:'Alto',mean:8.0,sd:0.40,lot:'QC-V350-L3'}]},
      {id:'AST',name:'AST (GOT)',unit:'U/L',active:true,levels:[{lv:1,name:'Basso',mean:25.0,sd:2.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:55.0,sd:4.0,lot:'QC-V350-L2'},{lv:3,name:'Alto',mean:180.0,sd:10.0,lot:'QC-V350-L3'}]},
      {id:'ALT',name:'ALT (GPT)',unit:'U/L',active:true,levels:[{lv:1,name:'Basso',mean:22.0,sd:2.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:50.0,sd:3.5,lot:'QC-V350-L2'},{lv:3,name:'Alto',mean:160.0,sd:9.0,lot:'QC-V350-L3'}]},
      {id:'ALP',name:'Fosfatasi Alcalina',unit:'U/L',active:true,levels:[{lv:1,name:'Basso',mean:45.0,sd:3.5,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:100.0,sd:6.0,lot:'QC-V350-L2'}]},
      {id:'GGT',name:'Gamma-GT',unit:'U/L',active:true,levels:[{lv:1,name:'Basso',mean:20.0,sd:2.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:60.0,sd:4.0,lot:'QC-V350-L2'},{lv:3,name:'Alto',mean:200.0,sd:12.0,lot:'QC-V350-L3'}]},
      {id:'TBIL',name:'Bilirubina Totale',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:0.5,sd:0.05,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:1.8,sd:0.12,lot:'QC-V350-L2'},{lv:3,name:'Alto',mean:10.0,sd:0.60,lot:'QC-V350-L3'}]},
      {id:'DBIL',name:'Bilirubina Diretta',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:0.1,sd:0.02,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:0.8,sd:0.06,lot:'QC-V350-L2'}]},
      {id:'TP',name:'Proteine Totali',unit:'g/dL',active:true,levels:[{lv:1,name:'Basso',mean:4.5,sd:0.20,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:7.0,sd:0.30,lot:'QC-V350-L2'}]},
      {id:'ALB',name:'Albumina',unit:'g/dL',active:true,levels:[{lv:1,name:'Basso',mean:2.5,sd:0.12,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:4.2,sd:0.18,lot:'QC-V350-L2'}]},
      {id:'CHOL',name:'Colesterolo Totale',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:120.0,sd:5.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:200.0,sd:8.0,lot:'QC-V350-L2'},{lv:3,name:'Alto',mean:310.0,sd:12.0,lot:'QC-V350-L3'}]},
      {id:'TRIG',name:'Trigliceridi',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:80.0,sd:5.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:160.0,sd:8.0,lot:'QC-V350-L2'},{lv:3,name:'Alto',mean:350.0,sd:18.0,lot:'QC-V350-L3'}]},
      {id:'HDL',name:'HDL',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:30.0,sd:2.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:55.0,sd:3.0,lot:'QC-V350-L2'}]},
      {id:'URIC',name:'Acido Urico',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:3.0,sd:0.20,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:6.0,sd:0.35,lot:'QC-V350-L2'}]},
      {id:'CA',name:'Calcio',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:7.5,sd:0.30,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:9.8,sd:0.35,lot:'QC-V350-L2'}]},
      {id:'PHOS',name:'Fosforo',unit:'mg/dL',active:false,levels:[{lv:1,name:'Basso',mean:2.5,sd:0.15,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:4.0,sd:0.22,lot:'QC-V350-L2'}]},
      {id:'NA',name:'Sodio',unit:'mEq/L',active:true,levels:[{lv:1,name:'Basso',mean:125.0,sd:2.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:140.0,sd:2.5,lot:'QC-V350-L2'}]},
      {id:'K',name:'Potassio',unit:'mEq/L',active:true,levels:[{lv:1,name:'Basso',mean:3.0,sd:0.15,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:4.5,sd:0.20,lot:'QC-V350-L2'}]},
      {id:'CL',name:'Cloro',unit:'mEq/L',active:true,levels:[{lv:1,name:'Basso',mean:90.0,sd:2.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:102.0,sd:2.5,lot:'QC-V350-L2'}]},
      {id:'FE',name:'Ferro',unit:'µg/dL',active:true,levels:[{lv:1,name:'Basso',mean:40.0,sd:4.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:100.0,sd:8.0,lot:'QC-V350-L2'}]},
      {id:'AMY',name:'Amilasi',unit:'U/L',active:false,levels:[{lv:1,name:'Basso',mean:35.0,sd:3.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:80.0,sd:5.0,lot:'QC-V350-L2'}]},
      {id:'LIP',name:'Lipasi',unit:'U/L',active:false,levels:[{lv:1,name:'Basso',mean:15.0,sd:2.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:40.0,sd:3.5,lot:'QC-V350-L2'}]},
      {id:'CK',name:'CK',unit:'U/L',active:false,levels:[{lv:1,name:'Basso',mean:50.0,sd:5.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:130.0,sd:10.0,lot:'QC-V350-L2'}]},
      {id:'LDH',name:'LDH',unit:'U/L',active:false,levels:[{lv:1,name:'Basso',mean:120.0,sd:8.0,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:220.0,sd:14.0,lot:'QC-V350-L2'}]},
      {id:'MG',name:'Magnesio',unit:'mg/dL',active:false,levels:[{lv:1,name:'Basso',mean:1.4,sd:0.10,lot:'QC-V350-L1'},{lv:2,name:'Normale',mean:2.1,sd:0.12,lot:'QC-V350-L2'}]},
      {id:'CRP',name:'PCR',unit:'mg/L',active:true,levels:[{lv:1,name:'Basso',mean:3.0,sd:0.30,lot:'QC-V350-L1'},{lv:2,name:'Alto',mean:50.0,sd:3.0,lot:'QC-V350-L2'}]},
    ]
  },
  {
    id:'AIA', name:'AIA 2000', type:'Immunometria', color:'#8e44ad', icon:'🔬',
    calLot:'CAL-AIA-2026', calExpiry:'2026-12-31',
    tests:[
      {id:'TSH',name:'TSH',unit:'µIU/mL',active:true,levels:[{lv:1,name:'Basso',mean:0.5,sd:0.05,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:5.0,sd:0.35,lot:'QC-AIA-L2'},{lv:3,name:'Alto',mean:25.0,sd:1.5,lot:'QC-AIA-L3'}]},
      {id:'FT3',name:'FT3',unit:'pg/mL',active:true,levels:[{lv:1,name:'Basso',mean:1.5,sd:0.12,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:3.2,sd:0.22,lot:'QC-AIA-L2'}]},
      {id:'FT4',name:'FT4',unit:'ng/dL',active:true,levels:[{lv:1,name:'Basso',mean:0.6,sd:0.05,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:1.5,sd:0.10,lot:'QC-AIA-L2'}]},
      {id:'PSA',name:'PSA Totale',unit:'ng/mL',active:true,levels:[{lv:1,name:'Basso',mean:1.0,sd:0.10,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:5.0,sd:0.35,lot:'QC-AIA-L2'},{lv:3,name:'Alto',mean:20.0,sd:1.2,lot:'QC-AIA-L3'}]},
      {id:'FPSA',name:'PSA Libero',unit:'ng/mL',active:false,levels:[{lv:1,name:'Basso',mean:0.3,sd:0.03,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:1.5,sd:0.12,lot:'QC-AIA-L2'}]},
      {id:'CEA',name:'CEA',unit:'ng/mL',active:true,levels:[{lv:1,name:'Basso',mean:2.0,sd:0.20,lot:'QC-AIA-L1'},{lv:2,name:'Alto',mean:15.0,sd:1.0,lot:'QC-AIA-L2'}]},
      {id:'AFP',name:'Alfa-fetoproteina',unit:'ng/mL',active:true,levels:[{lv:1,name:'Basso',mean:5.0,sd:0.50,lot:'QC-AIA-L1'},{lv:2,name:'Alto',mean:50.0,sd:3.5,lot:'QC-AIA-L2'}]},
      {id:'CA125',name:'CA 125',unit:'U/mL',active:true,levels:[{lv:1,name:'Basso',mean:15.0,sd:1.5,lot:'QC-AIA-L1'},{lv:2,name:'Alto',mean:80.0,sd:5.0,lot:'QC-AIA-L2'}]},
      {id:'CA199',name:'CA 19-9',unit:'U/mL',active:true,levels:[{lv:1,name:'Basso',mean:10.0,sd:1.0,lot:'QC-AIA-L1'},{lv:2,name:'Alto',mean:60.0,sd:4.0,lot:'QC-AIA-L2'}]},
      {id:'CA153',name:'CA 15-3',unit:'U/mL',active:false,levels:[{lv:1,name:'Basso',mean:12.0,sd:1.2,lot:'QC-AIA-L1'},{lv:2,name:'Alto',mean:50.0,sd:3.5,lot:'QC-AIA-L2'}]},
      {id:'FERR',name:'Ferritina',unit:'ng/mL',active:true,levels:[{lv:1,name:'Basso',mean:20.0,sd:2.0,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:120.0,sd:8.0,lot:'QC-AIA-L2'},{lv:3,name:'Alto',mean:500.0,sd:30.0,lot:'QC-AIA-L3'}]},
      {id:'B12',name:'Vitamina B12',unit:'pg/mL',active:true,levels:[{lv:1,name:'Basso',mean:150.0,sd:12.0,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:450.0,sd:30.0,lot:'QC-AIA-L2'}]},
      {id:'FOL',name:'Folati',unit:'ng/mL',active:true,levels:[{lv:1,name:'Basso',mean:3.0,sd:0.30,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:10.0,sd:0.80,lot:'QC-AIA-L2'}]},
      {id:'CORT',name:'Cortisolo',unit:'µg/dL',active:false,levels:[{lv:1,name:'Basso',mean:5.0,sd:0.50,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:15.0,sd:1.2,lot:'QC-AIA-L2'}]},
      {id:'INS',name:'Insulina',unit:'µIU/mL',active:false,levels:[{lv:1,name:'Basso',mean:5.0,sd:0.50,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:20.0,sd:1.5,lot:'QC-AIA-L2'}]},
      {id:'BHCG',name:'Beta-HCG',unit:'mIU/mL',active:true,levels:[{lv:1,name:'Basso',mean:10.0,sd:1.0,lot:'QC-AIA-L1'},{lv:2,name:'Alto',mean:500.0,sd:30.0,lot:'QC-AIA-L2'}]},
      {id:'PRL',name:'Prolattina',unit:'ng/mL',active:false,levels:[{lv:1,name:'Basso',mean:5.0,sd:0.50,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:15.0,sd:1.2,lot:'QC-AIA-L2'}]},
      {id:'TESTO',name:'Testosterone',unit:'ng/dL',active:false,levels:[{lv:1,name:'Basso',mean:100.0,sd:10.0,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:450.0,sd:30.0,lot:'QC-AIA-L2'}]},
      {id:'E2',name:'Estradiolo',unit:'pg/mL',active:false,levels:[{lv:1,name:'Basso',mean:30.0,sd:3.0,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:150.0,sd:12.0,lot:'QC-AIA-L2'}]},
      {id:'LH',name:'LH',unit:'mIU/mL',active:false,levels:[{lv:1,name:'Basso',mean:2.0,sd:0.20,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:8.0,sd:0.60,lot:'QC-AIA-L2'}]},
      {id:'FSH',name:'FSH',unit:'mIU/mL',active:false,levels:[{lv:1,name:'Basso',mean:3.0,sd:0.30,lot:'QC-AIA-L1'},{lv:2,name:'Normale',mean:10.0,sd:0.80,lot:'QC-AIA-L2'}]},
    ]
  },
  {
    id:'ACL', name:'ACL 7000', type:'Coagulazione', color:'#c0392b', icon:'🩹',
    calLot:'CAL-ACL-2026', calExpiry:'2026-12-31',
    tests:[
      {id:'PT',name:'PT (INR)',unit:'INR',active:true,levels:[{lv:1,name:'Normale',mean:1.0,sd:0.05,lot:'QC-ACL-L1'},{lv:2,name:'Alto',mean:2.5,sd:0.15,lot:'QC-ACL-L2'}]},
      {id:'APTT',name:'aPTT',unit:'sec',active:true,levels:[{lv:1,name:'Normale',mean:30.0,sd:1.5,lot:'QC-ACL-L1'},{lv:2,name:'Alto',mean:55.0,sd:3.0,lot:'QC-ACL-L2'}]},
      {id:'FIB',name:'Fibrinogeno',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:150.0,sd:10.0,lot:'QC-ACL-L1'},{lv:2,name:'Normale',mean:300.0,sd:18.0,lot:'QC-ACL-L2'},{lv:3,name:'Alto',mean:550.0,sd:30.0,lot:'QC-ACL-L3'}]},
      {id:'DDIM',name:'D-Dimero',unit:'µg/mL',active:true,levels:[{lv:1,name:'Normale',mean:0.3,sd:0.03,lot:'QC-ACL-L1'},{lv:2,name:'Alto',mean:2.0,sd:0.15,lot:'QC-ACL-L2'}]},
      {id:'ATIII',name:'Antitrombina III',unit:'%',active:true,levels:[{lv:1,name:'Basso',mean:60.0,sd:4.0,lot:'QC-ACL-L1'},{lv:2,name:'Normale',mean:100.0,sd:6.0,lot:'QC-ACL-L2'}]},
      {id:'PC',name:'Proteina C',unit:'%',active:false,levels:[{lv:1,name:'Basso',mean:50.0,sd:4.0,lot:'QC-ACL-L1'},{lv:2,name:'Normale',mean:100.0,sd:7.0,lot:'QC-ACL-L2'}]},
      {id:'PS',name:'Proteina S',unit:'%',active:false,levels:[{lv:1,name:'Basso',mean:45.0,sd:4.0,lot:'QC-ACL-L1'},{lv:2,name:'Normale',mean:90.0,sd:7.0,lot:'QC-ACL-L2'}]},
    ]
  },
  {
    id:'G8', name:'G8 Tosoh', type:'HbA1c', color:'#d35400', icon:'🧬',
    calLot:'CAL-G8-2026', calExpiry:'2026-12-31',
    tests:[
      {id:'HBA1C',name:'HbA1c',unit:'%',active:true,levels:[{lv:1,name:'Basso',mean:5.2,sd:0.15,lot:'QC-G8-L1'},{lv:2,name:'Normale',mean:7.0,sd:0.20,lot:'QC-G8-L2'},{lv:3,name:'Alto',mean:10.5,sd:0.30,lot:'QC-G8-L3'}]},
      {id:'HBF',name:'HbF',unit:'%',active:true,levels:[{lv:1,name:'Normale',mean:0.8,sd:0.10,lot:'QC-G8-L1'},{lv:2,name:'Alto',mean:5.0,sd:0.40,lot:'QC-G8-L2'}]},
      {id:'HBA2',name:'HbA2',unit:'%',active:true,levels:[{lv:1,name:'Normale',mean:2.5,sd:0.15,lot:'QC-G8-L1'},{lv:2,name:'Alto',mean:5.5,sd:0.30,lot:'QC-G8-L2'}]},
    ]
  },
  {
    id:'CHO', name:'DIESSE Chorus Trio', type:'Autoimmunità / Sierologia', color:'#16a085', icon:'🛡️',
    calLot:'CAL-CHO-2026', calExpiry:'2026-12-31',
    tests:[
      {id:'ANA',name:'ANA',unit:'UI/mL',active:true,levels:[{lv:1,name:'Negativo',mean:5.0,sd:1.0,lot:'QC-CHO-L1'},{lv:2,name:'Positivo',mean:40.0,sd:4.0,lot:'QC-CHO-L2'}]},
      {id:'DSDNA',name:'Anti-dsDNA',unit:'UI/mL',active:true,levels:[{lv:1,name:'Negativo',mean:8.0,sd:1.5,lot:'QC-CHO-L1'},{lv:2,name:'Positivo',mean:60.0,sd:5.0,lot:'QC-CHO-L2'}]},
      {id:'ENA',name:'ENA Screen',unit:'UI/mL',active:true,levels:[{lv:1,name:'Negativo',mean:5.0,sd:1.0,lot:'QC-CHO-L1'},{lv:2,name:'Positivo',mean:35.0,sd:3.5,lot:'QC-CHO-L2'}]},
      {id:'CCP',name:'Anti-CCP',unit:'UI/mL',active:true,levels:[{lv:1,name:'Negativo',mean:7.0,sd:1.5,lot:'QC-CHO-L1'},{lv:2,name:'Positivo',mean:50.0,sd:5.0,lot:'QC-CHO-L2'}]},
      {id:'RF',name:'Fattore Reumatoide',unit:'UI/mL',active:true,levels:[{lv:1,name:'Negativo',mean:8.0,sd:1.5,lot:'QC-CHO-L1'},{lv:2,name:'Positivo',mean:45.0,sd:4.0,lot:'QC-CHO-L2'}]},
      {id:'ASO',name:'ASO',unit:'UI/mL',active:true,levels:[{lv:1,name:'Basso',mean:80.0,sd:8.0,lot:'QC-CHO-L1'},{lv:2,name:'Alto',mean:300.0,sd:20.0,lot:'QC-CHO-L2'}]},
      {id:'C3',name:'C3',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:60.0,sd:5.0,lot:'QC-CHO-L1'},{lv:2,name:'Normale',mean:120.0,sd:8.0,lot:'QC-CHO-L2'}]},
      {id:'C4',name:'C4',unit:'mg/dL',active:true,levels:[{lv:1,name:'Basso',mean:10.0,sd:1.5,lot:'QC-CHO-L1'},{lv:2,name:'Normale',mean:30.0,sd:3.0,lot:'QC-CHO-L2'}]},
      {id:'IGG',name:'IgG',unit:'mg/dL',active:false,levels:[{lv:1,name:'Basso',mean:500.0,sd:40.0,lot:'QC-CHO-L1'},{lv:2,name:'Normale',mean:1100.0,sd:80.0,lot:'QC-CHO-L2'}]},
      {id:'IGA',name:'IgA',unit:'mg/dL',active:false,levels:[{lv:1,name:'Basso',mean:80.0,sd:8.0,lot:'QC-CHO-L1'},{lv:2,name:'Normale',mean:250.0,sd:20.0,lot:'QC-CHO-L2'}]},
      {id:'IGM',name:'IgM',unit:'mg/dL',active:false,levels:[{lv:1,name:'Basso',mean:40.0,sd:4.0,lot:'QC-CHO-L1'},{lv:2,name:'Normale',mean:130.0,sd:10.0,lot:'QC-CHO-L2'}]},
      {id:'TPO',name:'Anti-TPO',unit:'UI/mL',active:true,levels:[{lv:1,name:'Negativo',mean:10.0,sd:2.0,lot:'QC-CHO-L1'},{lv:2,name:'Positivo',mean:80.0,sd:6.0,lot:'QC-CHO-L2'}]},
      {id:'TG',name:'Anti-Tireoglobulina',unit:'UI/mL',active:true,levels:[{lv:1,name:'Negativo',mean:8.0,sd:1.5,lot:'QC-CHO-L1'},{lv:2,name:'Positivo',mean:60.0,sd:5.0,lot:'QC-CHO-L2'}]},
    ]
  },
];

/* ══════ ITALIAN HOLIDAYS ══════ */
function getItalianHolidays(year) {
  const f=[year+'-01-01',year+'-01-06',year+'-04-25',year+'-05-01',year+'-06-02',year+'-08-15',year+'-11-01',year+'-12-08',year+'-12-25',year+'-12-26'];
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,ff=Math.floor((b+8)/25);
  const g=Math.floor((b-ff+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4;
  const l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
  const easter=new Date(year,mo-1,da),em=new Date(easter);em.setDate(em.getDate()+1);
  f.push(fmtDate(easter),fmtDate(em));
  return new Set(f);
}
function fmtDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function getWorkingDays(year,month){
  const h=getItalianHolidays(year),days=[],dim=new Date(year,month+1,0).getDate();
  for(let d=1;d<=dim;d++){const dt=new Date(year,month,d),dow=dt.getDay(),iso=fmtDate(dt);if(dow>=1&&dow<=5&&!h.has(iso))days.push({date:iso,dayNum:d,dow});}
  return days;
}
const MONTH_NAMES=['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];

/* ══════ READINGS ══════ */
function rKey(machId,testId,lv,dateStr){return machId+'|'+testId+'|'+lv+'|'+dateStr;}
function getReading(machId,testId,lv,dateStr){return state.readings[rKey(machId,testId,lv,dateStr)]||null;}
function setReading(machId,testId,lv,dateStr,value,method,operator,notes){
  state.readings[rKey(machId,testId,lv,dateStr)]={value:parseFloat(value),time:new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}),
    method:method||'Manuale',operator:operator||'',notes:notes||'',timestamp:new Date().toISOString()};
  saveData();
}
function deleteReading(machId,testId,lv,dateStr){delete state.readings[rKey(machId,testId,lv,dateStr)];saveData();}

/* ══════ WESTGARD RULES ══════ */
function evalQC(value, mean, sd) {
  if(value==null||isNaN(value)) return {status:'missing',rule:''};
  const z = Math.abs(value - mean) / sd;
  if(z > 3)  return {status:'reject', rule:'1-3s'};
  if(z > 2)  return {status:'warning',rule:'1-2s'};
  return {status:'pass',rule:''};
}

/* ══════ PERSISTENCE ══════ */
function saveData(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({machines:state.machines,readings:state.readings}));}catch(e){console.warn('Save:',e);}}
function loadData(){
  try{const r=localStorage.getItem(STORAGE_KEY);if(r){const d=JSON.parse(r);if(d.machines?.length)state.machines=d.machines;if(d.readings)state.readings=d.readings;}}catch(e){}
  if(!state.machines.length) state.machines=JSON.parse(JSON.stringify(DEFAULT_MACHINES));
}

/* ══════ RANDOM QC GENERATOR ══════ */
function generateRandomQC(mean, sd) {
  const u1=Math.random(),u2=Math.random();
  const z=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
  return Math.round((mean+z*sd)*1000)/1000;
}

function newMachineId(){return 'M'+Date.now().toString(36).toUpperCase();}

/* ══════ LOT NUMBER GENERATORS ══════ */
function autoLotNumber(prefix){return (prefix||'LOT')+'-'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*9000)+1000);}
