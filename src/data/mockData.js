export const CPT_CODES = [
    // === HIGH-PAYING ORTHOPEDIC SURGERIES ===

    // Joint Replacements (Highest Revenue)
    { code: '27130', description: 'Total Hip Replacement', reimbursement: 15000, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Hip' },
    { code: '27447', description: 'Total Knee Replacement', reimbursement: 14500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Knee' },
    { code: '23472', description: 'Total Shoulder Replacement', reimbursement: 14200, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Shoulder' },
    { code: '27134', description: 'Revision Total Hip Replacement', reimbursement: 18000, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Hip' },
    { code: '27486', description: 'Revision Total Knee Replacement', reimbursement: 17500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Knee' },

    // Spine Surgeries (Very High Revenue)
    { code: '22612', description: 'Lumbar Fusion (Single Level)', reimbursement: 16500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Spine' },
    { code: '22614', description: 'Lumbar Fusion (Additional Level)', reimbursement: 8200, category: 'Orthopedics', procedure_indicator: 'A', body_part: 'Spine' },
    { code: '22630', description: 'Lumbar Interbody Fusion', reimbursement: 17200, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Spine' },
    { code: '63030', description: 'Lumbar Laminectomy (Single Level)', reimbursement: 12500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Spine' },
    { code: '63047', description: 'Lumbar Laminectomy (Additional Level)', reimbursement: 6200, category: 'Orthopedics', procedure_indicator: 'A', body_part: 'Spine' },

    // Shoulder Arthroscopy & Repairs
    { code: '29827', description: 'Arthroscopy Shoulder with Rotator Cuff Repair', reimbursement: 8500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Shoulder' },
    { code: '29826', description: 'Arthroscopy Shoulder with Decompression', reimbursement: 6800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Shoulder' },
    { code: '29824', description: 'Arthroscopy Shoulder with Distal Clavicle Excision', reimbursement: 6200, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Shoulder' },
    { code: '29806', description: 'Arthroscopy Shoulder Diagnostic', reimbursement: 4500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Shoulder' },
    { code: '23430', description: 'Biceps Tenodesis', reimbursement: 5800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Shoulder' },

    // Knee Arthroscopy & Repairs
    { code: '29881', description: 'Arthroscopy Knee with Meniscectomy', reimbursement: 5500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Knee' },
    { code: '29888', description: 'Arthroscopy Knee with Meniscus Repair', reimbursement: 6800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Knee' },
    { code: '29882', description: 'Arthroscopy Knee with Meniscectomy (Medial & Lateral)', reimbursement: 6200, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Knee' },
    { code: '29879', description: 'Arthroscopy Knee with Abrasion Arthroplasty', reimbursement: 5800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Knee' },
    { code: '29877', description: 'Arthroscopy Knee with Debridement', reimbursement: 4800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Knee' },

    // ACL/PCL Repairs (Sports Medicine)
    { code: '29888', description: 'ACL Reconstruction', reimbursement: 9500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Knee' },
    { code: '27407', description: 'PCL Reconstruction', reimbursement: 9200, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Knee' },
    { code: '27427', description: 'Ligamentous Reconstruction (MCL)', reimbursement: 7800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Knee' },

    // Hand & Wrist Surgeries
    { code: '25447', description: 'Arthroplasty with Implant (Wrist)', reimbursement: 8200, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Wrist' },
    { code: '64721', description: 'Carpal Tunnel Release', reimbursement: 3800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Hand' },
    { code: '26055', description: 'Trigger Finger Release', reimbursement: 2800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Hand' },
    { code: '26160', description: 'Excision Tendon Lesion', reimbursement: 3200, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Hand' },
    { code: '25111', description: 'Excision Ganglion Cyst (Wrist)', reimbursement: 3500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Wrist' },

    // Foot & Ankle Surgeries
    { code: '28297', description: 'Bunionectomy with Metatarsal Osteotomy', reimbursement: 5200, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Foot' },
    { code: '28725', description: 'Arthrodesis (Ankle)', reimbursement: 7800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Ankle' },
    { code: '27870', description: 'Arthroscopy Ankle Surgical', reimbursement: 5500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Ankle' },
    { code: '28292', description: 'Hallux Valgus Correction', reimbursement: 4800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Foot' },

    // Fracture Repairs (ORIF)
    { code: '27244', description: 'ORIF Femoral Fracture', reimbursement: 11500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Hip' },
    { code: '27759', description: 'ORIF Tibial Fracture', reimbursement: 10200, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Leg' },
    { code: '23615', description: 'ORIF Proximal Humerus Fracture', reimbursement: 9800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Shoulder' },
    { code: '25607', description: 'ORIF Distal Radius Fracture', reimbursement: 7500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Wrist' },

    // Injections & Minor Procedures
    { code: '20610', description: 'Arthrocentesis, Major Joint', reimbursement: 2500, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Joint' },
    { code: '20605', description: 'Arthrocentesis, Intermediate Joint', reimbursement: 1800, category: 'Orthopedics', procedure_indicator: 'S', body_part: 'Joint' },

    // === OTHER SPECIALTIES ===

    // Gastroenterology
    { code: '43239', description: 'EGD with Biopsy', reimbursement: 3000, category: 'Gastroenterology', procedure_indicator: 'S' },
    { code: '45378', description: 'Colonoscopy, Flexible', reimbursement: 3200, category: 'Gastroenterology', procedure_indicator: 'S' },
    { code: '45380', description: 'Colonoscopy with Biopsy', reimbursement: 3800, category: 'Gastroenterology', procedure_indicator: 'S' },
    { code: '45385', description: 'Colonoscopy with Polypectomy', reimbursement: 4200, category: 'Gastroenterology', procedure_indicator: 'S' },

    // Ophthalmology
    { code: '66984', description: 'Cataract Surgery with IOL', reimbursement: 4000, category: 'Ophthalmology', procedure_indicator: 'S' },
    { code: '67028', description: 'Vitrectomy', reimbursement: 5500, category: 'Ophthalmology', procedure_indicator: 'S' },

    // General Surgery
    { code: '10060', description: 'Incision and Drainage of Abscess', reimbursement: 2000, category: 'General', procedure_indicator: 'S' },
    { code: '11102', description: 'Tangential Biopsy of Skin', reimbursement: 1800, category: 'General', procedure_indicator: 'S' },
    { code: '11730', description: 'Avulsion of Nail Plate', reimbursement: 1600, category: 'General', procedure_indicator: 'S' },
    { code: '12001', description: 'Simple Repair of Superficial Wounds', reimbursement: 2200, category: 'General', procedure_indicator: 'S' },
    { code: '17000', description: 'Destruction of Premalignant Lesions', reimbursement: 1900, category: 'General', procedure_indicator: 'S' },
    { code: '19120', description: 'Excision Breast Lesion', reimbursement: 4500, category: 'General', procedure_indicator: 'S' },
    { code: '49505', description: 'Inguinal Hernia Repair', reimbursement: 5800, category: 'General', procedure_indicator: 'S' },
    { code: '47562', description: 'Laparoscopic Cholecystectomy', reimbursement: 6200, category: 'General', procedure_indicator: 'S' },
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
