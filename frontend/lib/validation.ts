/**
 * Frontend Validation Library
 * Provides reusable validation functions and error handling for forms
 */

export interface ValidationError {
    field: string
    message: string
}

export interface ValidationResult {
    valid: boolean
    errors: ValidationError[]
}

// Helper to create validation result
function createResult(errors: ValidationError[]): ValidationResult {
    return { valid: errors.length === 0, errors }
}

// Individual field validators
export const validators = {
    required: (value: string | undefined | null, fieldName: string): string | null => {
        if (!value || !value.trim()) {
            return `${fieldName} is required`
        }
        return null
    },

    minLength: (value: string, min: number, fieldName: string): string | null => {
        if (value && value.trim().length < min) {
            return `${fieldName} must be at least ${min} characters`
        }
        return null
    },

    maxLength: (value: string, max: number, fieldName: string): string | null => {
        if (value && value.length > max) {
            return `${fieldName} must be no more than ${max} characters`
        }
        return null
    },

    email: (value: string, fieldName: string): string | null => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (value && !emailRegex.test(value)) {
            return `${fieldName} must be a valid email address`
        }
        return null
    },

    phone: (value: string | undefined | null, fieldName: string): string | null => {
        if (!value) return null
        const phoneRegex = /^[\d\s\-\+\(\)]*$/
        if (!phoneRegex.test(value)) {
            return `${fieldName} contains invalid characters`
        }
        return null
    },

    date: (value: string | undefined | null, fieldName: string): string | null => {
        if (!value) return null
        const date = new Date(value)
        if (isNaN(date.getTime())) {
            return `${fieldName} must be a valid date`
        }
        return null
    },

    notFutureDate: (value: string | undefined | null, fieldName: string): string | null => {
        if (!value) return null
        const date = new Date(value)
        if (date > new Date()) {
            return `${fieldName} cannot be in the future`
        }
        return null
    },

    alphanumeric: (value: string | undefined | null, fieldName: string): string | null => {
        if (!value) return null
        const regex = /^[A-Za-z0-9\-]*$/
        if (!regex.test(value)) {
            return `${fieldName} must contain only letters, numbers, and hyphens`
        }
        return null
    },

    json: (value: string, fieldName: string): string | null => {
        try {
            JSON.parse(value)
            return null
        } catch {
            return `${fieldName} must be valid JSON`
        }
    },
}

// Form-specific validation functions
export function validateLoginForm(email: string, password: string): ValidationResult {
    const errors: ValidationError[] = []

    const emailRequired = validators.required(email, "Email")
    if (emailRequired) errors.push({ field: "email", message: emailRequired })
    else {
        const emailValid = validators.email(email, "Email")
        if (emailValid) errors.push({ field: "email", message: emailValid })
    }

    const passwordRequired = validators.required(password, "Password")
    if (passwordRequired) errors.push({ field: "password", message: passwordRequired })
    else {
        const passwordLength = validators.minLength(password, 6, "Password")
        if (passwordLength) errors.push({ field: "password", message: passwordLength })
    }

    return createResult(errors)
}

export function validateVerificationForm(form: {
    payer_name: string
    service_category: string
    patient_name: string
    date_of_birth: string
    member_id: string
    phone?: string
}): ValidationResult {
    const errors: ValidationError[] = []

    // Required fields
    const payerRequired = validators.required(form.payer_name, "Payer Name")
    if (payerRequired) errors.push({ field: "payer_name", message: payerRequired })
    else {
        const payerLength = validators.minLength(form.payer_name, 2, "Payer Name")
        if (payerLength) errors.push({ field: "payer_name", message: payerLength })
    }

    const serviceRequired = validators.required(form.service_category, "Service Category")
    if (serviceRequired) errors.push({ field: "service_category", message: serviceRequired })
    else {
        const serviceLength = validators.minLength(form.service_category, 2, "Service Category")
        if (serviceLength) errors.push({ field: "service_category", message: serviceLength })
    }

    const patientRequired = validators.required(form.patient_name, "Patient Name")
    if (patientRequired) errors.push({ field: "patient_name", message: patientRequired })
    else {
        const patientLength = validators.minLength(form.patient_name, 2, "Patient Name")
        if (patientLength) errors.push({ field: "patient_name", message: patientLength })
    }

    const dobRequired = validators.required(form.date_of_birth, "Date of Birth")
    if (dobRequired) errors.push({ field: "date_of_birth", message: dobRequired })
    else {
        const dobFuture = validators.notFutureDate(form.date_of_birth, "Date of Birth")
        if (dobFuture) errors.push({ field: "date_of_birth", message: dobFuture })
    }

    const memberRequired = validators.required(form.member_id, "Member ID")
    if (memberRequired) errors.push({ field: "member_id", message: memberRequired })

    // Optional field validation
    if (form.phone) {
        const phoneValid = validators.phone(form.phone, "Phone")
        if (phoneValid) errors.push({ field: "phone", message: phoneValid })
    }

    return createResult(errors)
}

export function validatePriorAuthForm(form: {
    medication_name: string
    procedure_code?: string
}): ValidationResult {
    const errors: ValidationError[] = []

    const medRequired = validators.required(form.medication_name, "Medication Name")
    if (medRequired) errors.push({ field: "medication_name", message: medRequired })
    else {
        const medLength = validators.minLength(form.medication_name, 2, "Medication Name")
        if (medLength) errors.push({ field: "medication_name", message: medLength })
    }

    if (form.procedure_code) {
        const codeValid = validators.alphanumeric(form.procedure_code, "Procedure Code")
        if (codeValid) errors.push({ field: "procedure_code", message: codeValid })
    }

    return createResult(errors)
}

export function validateReferralForm(form: {
    patient_name: string
    clinical_urgency: string
    referring_provider?: string
    target_specialty?: string
}): ValidationResult {
    const errors: ValidationError[] = []

    // Validate Patient Name
    const patientRequired = validators.required(form.patient_name, "Patient Name")
    if (patientRequired) errors.push({ field: "patient_name", message: patientRequired })
    else {
        const patientLength = validators.minLength(form.patient_name, 2, "Patient Name")
        if (patientLength) errors.push({ field: "patient_name", message: patientLength })
        else {
            const namePattern = /^[A-Za-z\s\-'\.]+$/
            if (!namePattern.test(form.patient_name.trim())) {
                errors.push({ field: "patient_name", message: "Patient Name should contain only letters, spaces, and hyphens" })
            }
        }
    }

    // Validate Referring Provider
    if (form.referring_provider) {
        const providerLength = validators.minLength(form.referring_provider, 2, "Source Provider")
        if (providerLength) errors.push({ field: "referring_provider", message: providerLength })
        else {
            const providerPattern = /^[A-Za-z\s\-'\.]+$/
            if (!providerPattern.test(form.referring_provider.trim())) {
                errors.push({ field: "referring_provider", message: "Provider Name should contain only letters, spaces, and hyphens" })
            }
        }
    }

    // Validate Target Specialty
    if (form.target_specialty) {
        const specialtyLength = validators.minLength(form.target_specialty, 2, "Target Specialty")
        if (specialtyLength) errors.push({ field: "target_specialty", message: specialtyLength })
        else {
            const specialtyPattern = /^[A-Za-z\s]+$/
            if (!specialtyPattern.test(form.target_specialty.trim())) {
                errors.push({ field: "target_specialty", message: "Specialty should contain only letters" })
            }
        }
    }

    // Validate Urgency
    const validUrgencies = ["routine", "urgent", "stat"]
    if (!validUrgencies.includes(form.clinical_urgency)) {
        errors.push({ field: "clinical_urgency", message: "Clinical urgency must be routine, urgent, or stat" })
    }

    return createResult(errors)
}

export function validateJsonField(value: string, fieldName: string): ValidationResult {
    const errors: ValidationError[] = []
    const jsonError = validators.json(value, fieldName)
    if (jsonError) errors.push({ field: fieldName, message: jsonError })
    return createResult(errors)
}

// Helper to get error for a specific field
export function getFieldError(errors: ValidationError[], field: string): string | undefined {
    return errors.find(e => e.field === field)?.message
}
