export const CPT_CODES = [
    { code: '10060', description: 'Incision and drainage of abscess', reimbursement: 2000, category: 'General', procedure_indicator: 'S' },
    { code: '11102', description: 'Tangential biopsy of skin', reimbursement: 1800, category: 'General', procedure_indicator: 'S' },
    { code: '11730', description: 'Avulsion of nail plate', reimbursement: 1600, category: 'General', procedure_indicator: 'S' },
    { code: '12001', description: 'Simple repair of superficial wounds', reimbursement: 2200, category: 'General', procedure_indicator: 'S' },
    { code: '17000', description: 'Destruction of premalignant lesions', reimbursement: 1900, category: 'General', procedure_indicator: 'S' },
    { code: '20610', description: 'Arthrocentesis, major joint/bursa', reimbursement: 2500, category: 'Orthopedics', procedure_indicator: 'S' },
    { code: '27130', description: 'Arthroplasty, hip', reimbursement: 15000, category: 'Orthopedics', procedure_indicator: 'S' },
    { code: '27447', description: 'Arthroplasty, knee', reimbursement: 14500, category: 'Orthopedics', procedure_indicator: 'S' },
    { code: '29881', description: 'Arthroscopy, knee, with meniscectomy', reimbursement: 5500, category: 'Orthopedics', procedure_indicator: 'S' },
    { code: '43239', description: 'EGD with biopsy', reimbursement: 3000, category: 'Gastroenterology', procedure_indicator: 'S' },
    { code: '45378', description: 'Colonoscopy, flexible', reimbursement: 3200, category: 'Gastroenterology', procedure_indicator: 'S' },
    { code: '66984', description: 'Cataract surgery with IOL', reimbursement: 4000, category: 'Ophthalmology', procedure_indicator: 'S' },
];

export const INITIAL_PATIENTS = [
    {
        id: 1,
        name: 'John Doe',
        dob: '1980-05-15',
        mrn: 'MRN001',
        phone: '(555) 111-2222',
        email: 'john.doe@email.com',
        address: '123 Oak Street, Naples, FL'
    },
    {
        id: 2,
        name: 'Jane Smith',
        dob: '1992-11-23',
        mrn: 'MRN002',
        phone: '(555) 333-4444',
        email: 'jane.smith@email.com',
        address: '456 Pine Avenue, Naples, FL'
    },
    {
        id: 3,
        name: 'Robert Johnson',
        dob: '1975-03-10',
        mrn: 'MRN003',
        phone: '(555) 555-6666',
        email: 'robert.j@email.com',
        address: '789 Maple Drive, Naples, FL'
    },
];

export const INITIAL_SURGERIES = [
    // Today's surgeries across different ORs
    {
        id: 1,
        patientId: 1,
        patient_name: 'John Doe',
        doctorName: 'Dr. Williams',
        doctor_name: 'Dr. Williams',
        cptCodes: ['27130', '20610'],
        cpt_codes: ['27130', '20610'],
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        start_time: '08:00',
        durationMinutes: 150,
        duration_minutes: 150,
        or_room: 1,
        status: 'scheduled'
    },
    {
        id: 2,
        patientId: 2,
        patient_name: 'Jane Smith',
        doctorName: 'Dr. Davis',
        doctor_name: 'Dr. Davis',
        cptCodes: ['45378'],
        cpt_codes: ['45378'],
        date: new Date().toISOString().split('T')[0],
        startTime: '11:00',
        start_time: '11:00',
        durationMinutes: 45,
        duration_minutes: 45,
        or_room: 2,
        status: 'scheduled'
    },
    {
        id: 3,
        patientId: 3,
        patient_name: 'Robert Johnson',
        doctorName: 'Dr. Chen',
        doctor_name: 'Dr. Chen',
        cptCodes: ['66984'],
        cpt_codes: ['66984'],
        date: new Date().toISOString().split('T')[0],
        startTime: '09:30',
        start_time: '09:30',
        durationMinutes: 90,
        duration_minutes: 90,
        or_room: 3,
        status: 'scheduled'
    },
    {
        id: 4,
        patientId: 1,
        patient_name: 'John Doe',
        doctorName: 'Dr. Williams',
        doctor_name: 'Dr. Williams',
        cptCodes: ['29881'],
        cpt_codes: ['29881'],
        date: new Date().toISOString().split('T')[0],
        startTime: '13:00',
        start_time: '13:00',
        durationMinutes: 120,
        duration_minutes: 120,
        or_room: 1,
        status: 'scheduled'
    },
    {
        id: 5,
        patientId: 2,
        patient_name: 'Jane Smith',
        doctorName: 'Dr. Davis',
        doctor_name: 'Dr. Davis',
        cptCodes: ['43239'],
        cpt_codes: ['43239'],
        date: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        start_time: '14:00',
        durationMinutes: 60,
        duration_minutes: 60,
        or_room: 4,
        status: 'scheduled'
    }
];

export const INITIAL_SURGEONS = [
    {
        id: 1,
        firstname: 'Sarah',
        lastname: 'Williams',
        specialty: 'Orthopedics',
        license_number: 'MD-45678',
        email: 'swilliams@hospital.com',
        phone: '(555) 123-4567'
    },
    {
        id: 2,
        firstname: 'Michael',
        lastname: 'Davis',
        specialty: 'Gastroenterology',
        license_number: 'MD-78901',
        email: 'mdavis@hospital.com',
        phone: '(555) 234-5678'
    },
    {
        id: 3,
        first_name: 'Emily',
        last_name: 'Chen',
        specialty: 'Ophthalmology',
        license_number: 'MD-34567',
        email: 'echen@hospital.com',
        phone: '(555) 345-6789'
    }
];
