const calculateDoctorProfileCompletion = (profile) => {
    const fields = ["specialty", "bio", "qualification", "experience", "hospital", "city", "state", "profile_image_url", "registration_number", "registration_year", "state_medical_council"];

    const filled = fields.filter((field)=>profile[field]).length;

    const percentage = Math.round((filled / fields.length) * 100);

    return percentage;
}

module.exports = {
    calculateDoctorProfileCompletion
}