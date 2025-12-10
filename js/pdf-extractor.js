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

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n\n';
                    }

                    this.rawText = fullText;
                    resolve(fullText);
                } catch (err) {
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

        // Split by question patterns
        const questionPatterns = [
            /(?:Q\.?\s*)?(\d+)[.\)]\s*/gi,  // Q1. or 1. or 1)
            /Question\s*(\d+)[.:\s]/gi,      // Question 1
        ];

        // Split text into lines and process
        const lines = text.split(/\n+/);
        let currentQuestion = null;
        let questionNumber = 0;

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // Check if line starts a new question
            let isNewQuestion = false;
            for (const pattern of questionPatterns) {
                pattern.lastIndex = 0;
                const match = pattern.exec(line);
                if (match && line.indexOf(match[0]) === 0) {
                    isNewQuestion = true;
                    questionNumber = parseInt(match[1]);
                    line = line.substring(match[0].length).trim();
                    break;
                }
            }

            if (isNewQuestion) {
                // Save previous question
                if (currentQuestion && currentQuestion.question) {
                    this.questions.push(currentQuestion);
                }

                // Start new question
                currentQuestion = {
                    number: questionNumber,
                    question: line,
                    options: { a: '', b: '', c: '', d: '' },
                    answer: '',
                    explanation: ''
                };
            } else if (currentQuestion) {
                // Check for options
                const optionMatch = line.match(/^[\(\[]?([a-dA-D])[\)\]\.]\s*(.+)/);
                if (optionMatch) {
                    const optLetter = optionMatch[1].toLowerCase();
                    currentQuestion.options[optLetter] = optionMatch[2].trim();
                }
                // Check for answer
                else if (/^(Answer|Ans|उत्तर)[:\s]*[\(\[]?([a-dA-D])[\)\]]?/i.test(line)) {
                    const ansMatch = line.match(/[\(\[]?([a-dA-D])[\)\]]?/i);
                    if (ansMatch) {
                        currentQuestion.answer = ansMatch[1].toLowerCase();
                    }
                }
                // Check for explanation
                else if (/^(Explanation|व्याख्या|Hint)[:\s]*/i.test(line)) {
                    currentQuestion.explanation = line.replace(/^(Explanation|व्याख्या|Hint)[:\s]*/i, '').trim();
                }
                // Append to explanation if we have an answer
                else if (currentQuestion.answer && line.length > 10) {
                    currentQuestion.explanation += ' ' + line;
                }
                // Append to question text if no options yet
                else if (!currentQuestion.options.a && line.length > 5) {
                    currentQuestion.question += ' ' + line;
                }
            }
        }

        // Add last question
        if (currentQuestion && currentQuestion.question) {
            this.questions.push(currentQuestion);
        }

        return this.questions;
    }

    /**
     * Convert to JSON format for import
     * @param {string} testName - Name of the test
     * @param {string} subject - Subject name
     * @returns {Object} - JSON object ready for import
     */
    toJSON(testName = 'Imported Test', subject = 'General') {
        return {
            id: 'test_' + Date.now(),
            title_en: testName,
            title_hi: null,
            subject: subject,
            total_questions: this.questions.length,
            time_limit_minutes: Math.ceil(this.questions.length * 1.2),
            difficulty: 'Moderate',
            created_at: new Date().toISOString(),
            questions: this.questions.map((q, i) => ({
                id: 'q_' + Date.now() + '_' + i,
                question_number: q.number || i + 1,
                question_text_en: q.question,
                question_text_hi: null,
                option_a_en: q.options.a,
                option_b_en: q.options.b,
                option_c_en: q.options.c,
                option_d_en: q.options.d,
                correct_option: q.answer || 'a',
                explanation_en: q.explanation,
                explanation_hi: null,
                difficulty: 'Moderate'
            }))
        };
    }

    /**
     * Get summary of extraction
     * @returns {Object} - Summary stats
     */
    getSummary() {
        const withAnswers = this.questions.filter(q => q.answer).length;
        const withExplanations = this.questions.filter(q => q.explanation).length;

        return {
            totalQuestions: this.questions.length,
            withAnswers: withAnswers,
            withExplanations: withExplanations,
            missingAnswers: this.questions.length - withAnswers
        };
    }
}

// Export for use
window.PDFQuestionExtractor = PDFQuestionExtractor;
