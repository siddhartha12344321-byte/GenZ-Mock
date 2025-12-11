/**
 * PDF Question Extractor for Gen-Z Mocks
 * =======================================
 * Extracts MCQs from PDF and outputs structured JSON
 * Uses Groq API for intelligent parsing
 */

class AIQuestionExtractor {
    constructor() {
        this.apiKey = this.getApiKey();
        this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile';
        this.isProcessing = false;
    }

    // ===== API KEY MANAGEMENT =====
    getApiKey() {
        return localStorage.getItem('genz_groq_api_key') || '';
    }

    setApiKey(key) {
        localStorage.setItem('genz_groq_api_key', key);
        this.apiKey = key;
        console.log('🔑 Groq API key saved');
    }

    hasApiKey() {
        return this.apiKey && this.apiKey.length > 20;
    }

    // ===== PDF TEXT EXTRACTION =====
    async extractTextFromPDF(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;

                    let fullText = '';
                    const totalPages = pdf.numPages;

                    for (let i = 1; i <= totalPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n\n--- PAGE BREAK ---\n\n';
                    }

                    console.log(`📄 Extracted ${totalPages} pages, ${fullText.length} characters`);
                    resolve({
                        success: true,
                        text: fullText,
                        pages: totalPages,
                        chars: fullText.length
                    });

                } catch (error) {
                    console.error('❌ PDF extraction failed:', error);
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    // ===== AI-POWERED QUESTION EXTRACTION =====
    async extractQuestionsFromText(rawText, options = {}) {
        if (!this.hasApiKey()) {
            throw new Error('Groq API key not configured. Please add your API key in Settings.');
        }

        // Limit text to avoid token limits
        const textToProcess = rawText.substring(0, 20000);

        const systemPrompt = `You are an MCQ extraction expert. Your ONLY job is to extract multiple choice questions from the given text and output them as a JSON array.

CRITICAL RULES:
1. OUTPUT ONLY VALID JSON - no explanations, no markdown, just pure JSON
2. Extract ALL questions you find in the text
3. Translate any Hindi/regional content to ENGLISH
4. Find the correct answer from answer keys if present
5. Each question MUST have: question text, 4 options (A,B,C,D), correct answer

OUTPUT THIS EXACT JSON FORMAT:
[
  {
    "qno": 1,
    "question": "What is the capital of India?",
    "a": "Mumbai",
    "b": "Delhi",
    "c": "Kolkata",
    "d": "Chennai",
    "answer": "b",
    "explanation": "Delhi is the capital of India"
  }
]

IMPORTANT: Start your response with [ and end with ] - ONLY JSON, nothing else!`;

        const userPrompt = `Extract all MCQ questions from this text and return as JSON array:\n\n${textToProcess}`;

        try {
            this.isProcessing = true;

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.1,
                    max_tokens: 8000
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            let content = data.choices[0]?.message?.content;

            if (!content) {
                throw new Error('Empty response from AI');
            }

            // Extract JSON from response
            const questions = this.parseJsonResponse(content);

            if (!questions || questions.length === 0) {
                throw new Error('No questions found in response');
            }

            console.log(`✅ Extracted ${questions.length} questions`);

            return {
                success: true,
                questions: questions,
                total: questions.length
            };

        } catch (error) {
            console.error('❌ Extraction failed:', error);
            return {
                success: false,
                error: error.message,
                questions: []
            };
        } finally {
            this.isProcessing = false;
        }
    }

    // ===== JSON PARSING WITH FALLBACKS =====
    parseJsonResponse(content) {
        // Clean the response
        let text = content.trim();

        // Try to find JSON array in the response
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']');

        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            text = text.substring(jsonStart, jsonEnd + 1);
        }

        // Remove markdown code blocks
        text = text.replace(/```json\s*/gi, '');
        text = text.replace(/```\s*/gi, '');
        text = text.trim();

        try {
            const parsed = JSON.parse(text);

            // Handle if it's wrapped in an object
            if (parsed.questions && Array.isArray(parsed.questions)) {
                return parsed.questions;
            }

            // Direct array
            if (Array.isArray(parsed)) {
                return parsed;
            }

            throw new Error('Invalid JSON structure');
        } catch (e) {
            console.error('JSON parse error:', e);
            console.log('Raw content:', content.substring(0, 500));
            throw new Error('Failed to parse AI response as JSON');
        }
    }

    // ===== MAIN EXTRACTION WORKFLOW =====
    async extractFromPDF(file, options = {}) {
        try {
            // Step 1: Extract raw text from PDF
            console.log('📄 Step 1: Extracting text from PDF...');
            const textResult = await this.extractTextFromPDF(file);

            if (!textResult.success) {
                return { success: false, error: 'Failed to extract text from PDF' };
            }

            console.log(`📝 Got ${textResult.chars} characters from ${textResult.pages} pages`);

            // Step 2: Send to AI for question extraction
            console.log('🤖 Step 2: AI extracting questions...');
            const aiResult = await this.extractQuestionsFromText(textResult.text, options);

            if (!aiResult.success) {
                return aiResult;
            }

            // Step 3: Convert to import format
            const formattedQuestions = this.formatForImport(aiResult.questions);

            return {
                success: true,
                questions: formattedQuestions,
                total: formattedQuestions.length,
                pdfInfo: {
                    pages: textResult.pages,
                    chars: textResult.chars
                }
            };

        } catch (error) {
            console.error('❌ PDF extraction workflow failed:', error);
            return {
                success: false,
                error: error.message,
                questions: []
            };
        }
    }

    // ===== FORMAT FOR MOCK ENGINE =====
    formatForImport(questions) {
        return questions.map((q, index) => ({
            question_number: q.qno || index + 1,
            question_text_en: q.question || '',
            question_text_hi: '',
            option_a_en: q.a || q.option_a || '',
            option_a_hi: '',
            option_b_en: q.b || q.option_b || '',
            option_b_hi: '',
            option_c_en: q.c || q.option_c || '',
            option_c_hi: '',
            option_d_en: q.d || q.option_d || '',
            option_d_hi: '',
            correct_option: (q.answer || 'a').toLowerCase(),
            explanation_en: q.explanation || '',
            explanation_hi: '',
            difficulty: 'moderate'
        }));
    }

    // ===== CONVERT TO ADMIN DATA FORMAT =====
    toImportFormat(questions, testName, subject) {
        return {
            title_en: testName,
            subject: subject,
            total_questions: questions.length,
            time_limit_minutes: Math.ceil(questions.length * 1.5),
            questions: questions
        };
    }

    // ===== AI QUESTION GENERATION =====
    async generateQuestions(options) {
        if (!this.hasApiKey()) {
            throw new Error('Groq API key not configured');
        }

        const {
            topic = 'General Knowledge',
            count = 10,
            difficulty = 'moderate'
        } = options;

        const systemPrompt = `You are an expert question paper creator. Generate exactly ${count} high-quality MCQ questions.

OUTPUT ONLY THIS JSON FORMAT - no other text:
[
  {
    "qno": 1,
    "question": "Question text here?",
    "a": "Option A",
    "b": "Option B",
    "c": "Option C",
    "d": "Option D",
    "answer": "a",
    "explanation": "Brief explanation"
  }
]

RULES:
- Difficulty: ${difficulty}
- All options should be plausible
- Questions should be factually accurate
- START WITH [ and END WITH ]`;

        const userPrompt = `Generate ${count} ${difficulty} MCQ questions on: ${topic}`;

        try {
            this.isProcessing = true;

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.7,
                    max_tokens: 8000
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `API Error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (!content) {
                throw new Error('Empty response from AI');
            }

            const questions = this.parseJsonResponse(content);
            const formattedQuestions = this.formatForImport(questions);

            console.log(`✅ Generated ${formattedQuestions.length} questions`);

            return {
                success: true,
                questions: formattedQuestions,
                total: formattedQuestions.length,
                topic: topic
            };

        } catch (error) {
            console.error('❌ Generation failed:', error);
            return {
                success: false,
                error: error.message,
                questions: []
            };
        } finally {
            this.isProcessing = false;
        }
    }

    // ===== TEST CONNECTION =====
    async testConnection() {
        if (!this.hasApiKey()) {
            return { success: false, error: 'No API key configured' };
        }

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'Say OK' }],
                    max_tokens: 5
                })
            });

            if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.error?.message || 'Connection failed' };
            }

            return { success: true, message: 'Groq API connected successfully!' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Create global instance
window.aiExtractor = new AIQuestionExtractor();
console.log('✅ AI Question Extractor loaded');
