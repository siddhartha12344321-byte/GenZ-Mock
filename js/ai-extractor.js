/**
 * AI-Powered Question Extractor for Gen-Z Mocks
 * ==============================================
 * Uses Groq API (FREE) for intelligent MCQ extraction
 * Features: PDF text parsing, AI extraction, question generation
 */

class AIQuestionExtractor {
    constructor() {
        this.apiKey = this.getApiKey();
        this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile'; // Updated: Current supported model
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

    // ===== CORE AI EXTRACTION =====

    async extractQuestionsFromText(rawText, options = {}) {
        if (!this.hasApiKey()) {
            throw new Error('Groq API key not configured. Please add your API key in settings.');
        }

        const testName = options.testName || 'Imported Test';
        const subject = options.subject || 'General';

        const systemPrompt = `You are an expert MCQ question parser. Your task is to extract ALL multiple choice questions from the given text.

IMPORTANT RULES:
1. Extract EVERY question you find - do not skip any
2. Identify options A, B, C, D for each question
3. Look for answer keys at the end to find correct answers
4. If answer key exists, match question numbers to answers
5. If no answer key, set correct_option to null
6. Clean up any OCR artifacts or formatting issues
7. Preserve the original question numbering

OUTPUT FORMAT (strict JSON):
{
  "questions": [
    {
      "question_number": 1,
      "question_text_en": "The complete question text here",
      "option_a_en": "Option A text",
      "option_b_en": "Option B text", 
      "option_c_en": "Option C text",
      "option_d_en": "Option D text",
      "correct_option": "a" or "b" or "c" or "d" or null,
      "explanation_en": "Brief explanation if available, otherwise empty string"
    }
  ],
  "total_extracted": 10,
  "has_answer_key": true
}

RESPOND ONLY WITH VALID JSON. No markdown, no explanations.`;

        const userPrompt = `Extract all MCQ questions from this text:\n\n${rawText.substring(0, 15000)}`;

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
                    max_tokens: 8000,
                    response_format: { type: 'json_object' }
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

            const result = JSON.parse(content);
            console.log(`✅ AI extracted ${result.questions?.length || 0} questions`);

            return {
                success: true,
                questions: result.questions || [],
                total: result.total_extracted || result.questions?.length || 0,
                hasAnswerKey: result.has_answer_key || false
            };

        } catch (error) {
            console.error('❌ AI extraction failed:', error);
            return {
                success: false,
                error: error.message,
                questions: []
            };
        } finally {
            this.isProcessing = false;
        }
    }

    // ===== AI QUESTION GENERATION =====

    async generateQuestions(options) {
        if (!this.hasApiKey()) {
            throw new Error('Groq API key not configured');
        }

        const {
            topic = 'General Knowledge',
            subject = 'General',
            count = 10,
            difficulty = 'moderate',
            language = 'english',
            includeExplanations = true
        } = options;

        const systemPrompt = `You are an expert question paper creator for competitive exams like UPSC, SSC, Banking.
Create high-quality MCQ questions that are factually accurate and exam-relevant.

RULES:
1. Create exactly ${count} unique questions
2. Difficulty level: ${difficulty}
3. Topic: ${topic}
4. All options should be plausible
5. Questions should test real knowledge, not trivial facts
6. Include Hindi translations if possible
${includeExplanations ? '7. Add brief, informative explanations for each answer' : ''}

OUTPUT FORMAT (strict JSON):
{
  "questions": [
    {
      "question_number": 1,
      "question_text_en": "...",
      "question_text_hi": "...",
      "option_a_en": "...",
      "option_a_hi": "...",
      "option_b_en": "...",
      "option_b_hi": "...",
      "option_c_en": "...",
      "option_c_hi": "...",
      "option_d_en": "...",
      "option_d_hi": "...",
      "correct_option": "a|b|c|d",
      "explanation_en": "...",
      "explanation_hi": "...",
      "difficulty": "easy|moderate|difficult"
    }
  ],
  "topic": "${topic}",
  "total_generated": ${count}
}

RESPOND ONLY WITH VALID JSON.`;

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
                    max_tokens: 8000,
                    response_format: { type: 'json_object' }
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

            const result = JSON.parse(content);
            console.log(`✅ AI generated ${result.questions?.length || 0} questions`);

            return {
                success: true,
                questions: result.questions || [],
                total: result.total_generated || result.questions?.length || 0,
                topic: result.topic
            };

        } catch (error) {
            console.error('❌ AI generation failed:', error);
            return {
                success: false,
                error: error.message,
                questions: []
            };
        } finally {
            this.isProcessing = false;
        }
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
                        fullText += pageText + '\n\n';
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

    // ===== COMBINED WORKFLOW =====

    async extractFromPDF(file, options = {}) {
        // Step 1: Extract text from PDF
        const textResult = await this.extractTextFromPDF(file);
        if (!textResult.success) {
            return { success: false, error: 'Failed to extract text from PDF' };
        }

        // Step 2: Use AI to parse questions
        const aiResult = await this.extractQuestionsFromText(textResult.text, options);

        return {
            ...aiResult,
            pdfInfo: {
                pages: textResult.pages,
                chars: textResult.chars
            }
        };
    }

    // ===== CONVERT TO IMPORT FORMAT =====

    toImportFormat(questions, testName, subject) {
        return {
            title_en: testName,
            subject: subject,
            total_questions: questions.length,
            time_limit_minutes: Math.ceil(questions.length * 1.5),
            questions: questions.map((q, i) => ({
                question_number: q.question_number || i + 1,
                question_text_en: q.question_text_en || '',
                question_text_hi: q.question_text_hi || '',
                option_a_en: q.option_a_en || '',
                option_a_hi: q.option_a_hi || '',
                option_b_en: q.option_b_en || '',
                option_b_hi: q.option_b_hi || '',
                option_c_en: q.option_c_en || '',
                option_c_hi: q.option_c_hi || '',
                option_d_en: q.option_d_en || '',
                option_d_hi: q.option_d_hi || '',
                correct_option: q.correct_option || 'a',
                explanation_en: q.explanation_en || '',
                explanation_hi: q.explanation_hi || '',
                difficulty: q.difficulty || 'moderate'
            }))
        };
    }

    // ===== STATUS CHECK =====

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
console.log('✅ AI Question Extractor loaded (Groq API)');
