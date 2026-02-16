// API Configuration
const API_DOMAIN = 'https://tracking.etech.quest';
const API_TOKEN = 'XAB1c266S8Ttnu5iKKbzP3XLHbDexEyWqv3jpzY5tXceCuxvBmsPCxSZKMXw';
const LINK_ID = 2762;

// Get user IP address
async function getUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.error('Error getting IP:', error);
        // Fallback: try to get IP from another service
        try {
            const response = await fetch('https://api64.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error2) {
            console.error('Error getting IP from fallback:', error2);
            return '0.0.0.0'; // Fallback IP
        }
    }
}

// Format phone number to E.164 format (with +)
function formatPhone(phone) {
    // Remove all spaces, dashes, and parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // If it doesn't start with +, add it
    if (!cleaned.startsWith('+')) {
        // If it starts with 998 (Uzbekistan code), add +
            if (cleaned.startsWith('998')) {
                cleaned = '+' + cleaned;
            } else {
                // Assume it's a local number, add +998
                cleaned = '+998' + cleaned;
            }
    }
    
    return cleaned;
}

// Get current language from page
function getCurrentLanguage() {
    const lang = document.documentElement.lang || 'ru';
    return lang === 'uz' ? 'uz' : 'ru';
}

// Send lead to API
async function sendLead(formData) {
    try {
        // Get user IP
        const ip = await getUserIP();
        
        // Get current language
        const language = getCurrentLanguage();
        
        // Get domain
        const domain = window.location.hostname;
        
        // Prepare data for API
        const apiData = {
            link_id: LINK_ID,
            fname: formData.firstName,
            lname: formData.lastName,
            email: formData.email,
            fullphone: formatPhone(formData.phone),
            ip: ip,
            country: 'UZ', // Uzbekistan
            language: language,
            domain: domain,
            funnel: 'usmanov-invest',
            source: 'landing',
            description: `Call time preference: ${formData.callTime}`
        };
        
        // Build URL with API token
        const url = `${API_DOMAIN}/api/v3/integration?api_token=${encodeURIComponent(API_TOKEN)}`;
        
        // Send POST request using JSON
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiData)
        });
        
        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            console.error('Error parsing API response:', parseError);
            return {
                success: false,
                message: 'Ошибка сервера. Попробуйте позже. (HTTP ' + response.status + ')'
            };
        }
        
        return result;
    } catch (error) {
        console.error('Error sending lead:', error);
        return {
            success: false,
            message: 'Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.'
        };
    }
}

// Handle form submission
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registrationForm');
    
    if (!form) {
        console.error('Registration form not found');
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form elements
        const firstName = document.getElementById('firstName');
        const lastName = document.getElementById('lastName');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const callTime = document.querySelector('input[name="callTime"]:checked');
        
        // Validate form
        if (!firstName || !lastName || !email || !phone || !callTime) {
            alert('Пожалуйста, заполните все поля формы.');
            return;
        }
        
        // Disable submit button
        const submitButton = document.getElementById('submit-button');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i><span>Отправка...</span>';
        
        // Prepare form data
        const formData = {
            firstName: firstName.value.trim(),
            lastName: lastName.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
            callTime: callTime.value
        };
        
        // Send lead to API
        const result = await sendLead(formData);
        
                if (result.success) {
                    // Сохраняем детальные данные лида на сервере для бота
                    if (result.id) {
                        try {
                            console.log('💾 Отправка детальных данных для лида:', result.id, {
                                firstName: formData.firstName,
                                lastName: formData.lastName,
                                email: formData.email,
                                phone: formatPhone(formData.phone)
                            });
                            
                            const saveResponse = await fetch('http://89.124.72.119:3000//api/leads/save-details', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    leadId: result.id,
                                    leadData: {
                                        fname: formData.firstName,
                                        lname: formData.lastName,
                                        email: formData.email,
                                        fullphone: formatPhone(formData.phone),
                                        country: 'UZ',
                                        language: getCurrentLanguage(),
                                        domain: window.location.hostname,
                                        funnel: 'usmanov-invest',
                                        source: 'landing',
                                        campaign: 'landing',
                                        description: `Call time preference: ${formData.callTime}`,
                                        linkId: LINK_ID,
                                        createdAt: new Date().toISOString()
                                    }
                                })
                            });
                            
                            const saveResult = await saveResponse.json();
                            if (saveResult.success) {
                                console.log('✅ Детальные данные успешно сохранены для лида:', result.id);
                            } else {
                                console.warn('⚠️ Не удалось сохранить детальные данные:', saveResult.error);
                            }
                        } catch (saveError) {
                            console.error('❌ Ошибка сохранения детальных данных:', saveError);
                            // Не блокируем успешную регистрацию, если сохранение не удалось
                        }
                    }
                    
                    // Hide form
                    form.style.display = 'none';
                    
                    // Show success section
                    const successSection = document.getElementById('successSection');
                    if (successSection) {
                        successSection.classList.remove('hidden');
                    }
                    
                    // Show success modal
                    const successModal = document.getElementById('successModal');
                    if (successModal) {
                        successModal.classList.remove('hidden');
                    }
                } else {
            // Show error message
            let errorMessage = result.message || 'Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.';
            
            // Translate common error messages
            if (errorMessage.includes('Unrecognized error') || errorMessage.includes('Error!')) {
                errorMessage = 'Ошибка регистрации. Пожалуйста, убедитесь, что вы находитесь в Узбекистане или используйте VPN с узбекским IP-адресом.';
            }
            
            alert(errorMessage);
            
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
});
