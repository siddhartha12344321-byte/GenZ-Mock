/**
 * PDF Question Extractor for Gen-Z Mocks
 * ========================================
 * Browser-based MCQ extraction from PDF files
 * Uses PDF.js for text extraction
 */

class PDFQuestionExtractor {
    constructor() {
        this.questions = [];
        this.rawText = '';
    }

    /**
     * Extract text from PDF file
     * @param {File} file - PDF file object
     * @returns {Promise<string>} - Extracted text
     */
    async extractText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;

                    let fullText = '';
                    console.log(`📄 Processing ${pdf.numPages} pages...`);

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();

                        // Better text extraction - preserve line structure
                        let lastY = null;
                        let pageText = '';

                        textContent.items.forEach(item => {
                            if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
                                pageText += '\n';
                            }
                            pageText += item.str + ' ';
                            lastY = item.transform[5];
                        });

                        fullText += pageText + '\n\n';
                    }

                    this.rawText = fullText;
                    console.log('📄 Extracted text length:', fullText.length);
                    console.log('📄 Sample text:', fullText.substring(0, 500));
                    resolve(fullText);
                } catch (err) {
                    console.error('PDF extraction error:', err);
                    reject(err);
                }
            };

            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Parse extracted text into questions
     * @param {string} text - Raw text from PDF
     * @returns {Array} - Array of question objects
     */
    parseQuestions(text) {
        this.questions = [];

        console.log('🔍 Parsing text for questions...');

        // Try multiple extraction strategies
        let questions = this._extractWithNumberPattern(text);

        if (questions.length === 0) {
            console.log('Trying alternative extraction...');
            questions = this._extractWithQPattern(text);
        }

        if (questions.length === 0) {
            console.log('Trying line-by-line extraction...');
            questions = this._extractLineByLine(text);
        }

        this.questions = questions;
        console.log(`✅ Found ${questions.length} questions`);

        return this.questions;
    }

    /**
     * Extract using number pattern (1. 2. 3. etc)
     */
    _extractWithNumberPattern(text) {
        const questions = [];

        // Split by question numbers like "1." "2." etc at start of line or after newline
        const parts = text.split(/(?:^|\n)\s*(\d+)\s*[.\)]\s*/);

        console.log('Number pattern parts:', parts.length);

        for (let i = 1; i < parts.length; i += 2) {
            const qNum = parseInt(parts[i]);
            const content = parts[i + 1] || '';

            if (content.length > 10) {
                const q = this._parseQuestionContent(qNum, content);
                if (q) questions.push(q);
            }
        }

        return questions;
    }

    /**
     * Extract using Q. pattern
     */
    _extractWithQPattern(text) {
        const questions = [];

        // Split by Q1. Q.1 Q1) patterns
        const parts = text.split(/Q\.?\s*(\d+)\s*[.\)]/i);

        console.log('Q pattern parts:', parts.length);

        for (let i = 1; i < parts.length; i += 2) {
            const qNum = parseInt(parts[i]);
            const content = parts[i + 1] || '';

            if (content.length > 10) {
                const q = this._parseQuestionContent(qNum, content);
                if (q) questions.push(q);
            }
        }

        return questions;
    }

    /**
     * Extract line by line - more aggressive approach
     */
    _extractLineByLine(text) {
        const questions = [];
        const lines = text.split('\n');

        let currentQ = null;
        let qNumber = 0;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Check if starts with number
            const numMatch = trimmed.match(/^(\d+)\s*[.\)]\s*(.+)/);
            if (numMatch && parseInt(numMatch[1]) === qNumber + 1) {
                // Save previous question
                if (currentQ && currentQ.question.length > 10) {
                    questions.push(currentQ);
                }

                qNumber = parseInt(numMatch[1]);
                currentQ = {
                    number: qNumber,
                    question: numMatch[2],
                    options: { a: '', b: '', c: '', d: '' },
                    answer: '',
                    explanation: ''
                };
                continue;
            }

            if (currentQ) {
                // Check for options
                const optMatch = trimmed.match(/^[\(\[]?([a-dA-D])[\)\].\s]+(.+)/);
                if (optMatch) {
                    currentQ.options[optMatch[1].toLowerCase()] = optMatch[2].trim();
                    continue;
                }

                // Check for answer
                const ansMatch = trimmed.match(/(?:Answer|Ans|उत्तर)[:\s]*[\(\[]?([a-dA-D])[\)\]]?/i);
                if (ansMatch) {
                    currentQ.answer = ansMatch[1].toLowerCase();
                    continue;
                }

                // Append to question if no options yet
                if (!currentQ.options.a && trimmed.length > 3) {
                    currentQ.question += ' ' + trimmed;
                }
            }
        }

        // Add last question
        if (currentQ && currentQ.question.length > 10) {
            questions.push(currentQ);
        }

        return questions;
    }

    /**
     * Parse individual question content
     */
    _parseQuestionContent(number, content) {
        const q = {
            number: number,
            question: '',
            options: { a: '', b: '', c: '', d: '' },
            answer: '',
            explanation: ''
        };

        // Split content into parts
        const lines = content.split('\n');
        let inQuestion = true;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Check for options (a) b) c. D. etc
            const optMatch = trimmed.match(/^[\(\[]?([a-dA-D])[\)\].\s]+(.+)/);
            if (optMatch) {
                inQuestion = false;
                q.options[optMatch[1].toLowerCase()] = optMatch[2].trim();
                continue;
            }

            // Check for answer
            const ansMatch = trimmed.match(/(?:Answer|Ans|उत्तर|Correct)[:\s]*[\(\[]?([a-dA-D])[\)\]]?/i);
            if (ansMatch) {
                q.answer = ansMatch[1].toLowerCase();
                continue;
            }

            // Check for explanation
            if (/^(?:Explanation|व्याख्या|Hint|Solution)[:\s]*/i.test(trimmed)) {
                q.explanation = trimmed.replace(/^(?:Explanation|व्याख्या|Hint|Solution)[:\s]*/i, '');
                continue;
            }

            // If we're still building the question
            if (inQuestion) {
                q.question += (q.question ? ' ' : '') + trimmed;
            } else if (q.answer) {
                // After answer, it's explanation
                q.explanation += (q.explanation ? ' ' : '') + trimmed;
            }
        }

        // Return only if we have at least a question and one option
        if (q.question.length > 5 && (q.options.a || q.options.b)) {
            return q;
        }

        return null;
    }

    /**
     * Convert to JSON format for import
     */
    toJSON(testName = 'Imported Test', subject = 'General') {
        return {
            id: 'test_' + Date.now(),
            title_en: testName,
            title_hi: null,
            subject: subject,
            total_questions: this.questions.length,
            time_limit_minutes: Math.max(30, Math.ceil(this.questions.length * 1.2)),
            difficulty: 'Moderate',
            created_at: new Date().toISOString(),
            questions: this.questions.map((q, i) => ({
                id: 'q_' + Date.now() + '_' + i,
                question_number: q.number || i + 1,
                question_text_en: q.question,
                question_text_hi: null,
                option_a_en: q.options.a || '',
                option_b_en: q.options.b || '',
                option_c_en: q.options.c || '',
                option_d_en: q.options.d || '',
                correct_option: q.answer || 'a',
                explanation_en: q.explanation || '',
                explanation_hi: null,
                difficulty: 'Moderate'
            }))
        };
    }

    /**
     * Get summary of extraction
     */
    getSummary() {
        const withAnswers = this.questions.filter(q => q.answer).length;
        const withOptions = this.questions.filter(q => q.options.a && q.options.b).length;

        return {
            totalQuestions: this.questions.length,
            withAnswers: withAnswers,
            withExplanations: this.questions.filter(q => q.explanation).length,
            missingAnswers: this.questions.length - withAnswers,
            withOptions: withOptions
        };
    }
}

// Export for use
window.PDFQuestionExtractor = PDFQuestionExtractor;
console.log('✅ PDF Extractor loaded');
