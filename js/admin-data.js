/**
 * Admin Data Manager for Gen-Z Mocks
 * ===================================
 * Handles all data operations with localStorage fallback
 * When Supabase tables are ready, it will use Supabase
 */

class AdminDataManager {
    constructor() {
        this.storagePrefix = 'genz_';
        this.mockTests = this.load('mock_tests') || [];
        this.questions = this.load('questions') || [];
        this.accessKeys = this.load('access_keys') || [];
        this.subjects = this.getDefaultSubjects();

        console.log('📦 AdminDataManager initialized');
        console.log(`   - ${this.mockTests.length} tests`);
        console.log(`   - ${this.questions.length} questions`);
        console.log(`   - ${this.accessKeys.length} access keys`);
    }

    // ===== STORAGE HELPERS =====

    load(key) {
        try {
            return JSON.parse(localStorage.getItem(this.storagePrefix + key));
        } catch {
            return null;
        }
    }

    save(key, data) {
        localStorage.setItem(this.storagePrefix + key, JSON.stringify(data));
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // ===== SUBJECTS =====

    getDefaultSubjects() {
        return [
            { id: 'polity', name_en: 'Indian Polity', name_hi: 'भारतीय राजव्यवस्था', icon: '⚖️' },
            { id: 'history', name_en: 'History', name_hi: 'इतिहास', icon: '📜' },
            { id: 'geography', name_en: 'Geography', name_hi: 'भूगोल', icon: '🌍' },
            { id: 'economy', name_en: 'Economy', name_hi: 'अर्थव्यवस्था', icon: '📊' },
            { id: 'environment', name_en: 'Environment', name_hi: 'पर्यावरण', icon: '🌱' },
            { id: 'science', name_en: 'Science & Technology', name_hi: 'विज्ञान एवं प्रौद्योगिकी', icon: '🔬' },
            { id: 'current', name_en: 'Current Affairs', name_hi: 'समसामयिकी', icon: '📰' },
            { id: 'culture', name_en: 'Art & Culture', name_hi: 'कला एवं संस्कृति', icon: '🎨' }
        ];
    }

    getSubjectByValue(value) {
        return this.subjects.find(s => s.id === value || s.name_en.toLowerCase().includes(value.toLowerCase()));
    }

    // ===== MOCK TESTS =====

    getAllTests() {
        return this.mockTests;
    }

    getTestById(id) {
        return this.mockTests.find(t => t.id === id);
    }

    createTest(testData) {
        const test = {
            id: this.generateId(),
            name_en: testData.name_en,
            name_hi: testData.name_hi || '',
            subject_id: testData.subject,
            difficulty: testData.difficulty || 'moderate',
            total_questions: testData.questions || 0,
            time_limit: testData.time || 120,
            mark_correct: testData.mark_correct || 2,
            mark_wrong: testData.mark_wrong || 0.66,
            source: testData.source || '',
            description: testData.description || '',
            is_active: true,
            created_at: new Date().toISOString(),
            attempts: 0
        };

        this.mockTests.unshift(test);
        this.save('mock_tests', this.mockTests);
        console.log('✅ Test created:', test.name_en);
        return test;
    }

    updateTest(id, updates) {
        const index = this.mockTests.findIndex(t => t.id === id);
        if (index !== -1) {
            this.mockTests[index] = { ...this.mockTests[index], ...updates };
            this.save('mock_tests', this.mockTests);
            return true;
        }
        return false;
    }

    deleteTest(id) {
        const index = this.mockTests.findIndex(t => t.id === id);
        if (index !== -1) {
            this.mockTests.splice(index, 1);
            this.save('mock_tests', this.mockTests);
            // Also delete associated questions
            this.questions = this.questions.filter(q => q.test_id !== id);
            this.save('questions', this.questions);
            return true;
        }
        return false;
    }

    // ===== QUESTIONS =====

    getAllQuestions() {
        return this.questions;
    }

    getQuestionsByTestId(testId) {
        return this.questions.filter(q => q.test_id === testId);
    }

    addQuestionsToTest(testId, questionsData) {
        const newQuestions = questionsData.map((q, i) => ({
            id: this.generateId(),
            test_id: testId,
            question_number: q.question_number || i + 1,
            question_text_en: q.question_text_en || q.question_text || q.question || '',
            question_text_hi: q.question_text_hi || '',
            option_a_en: q.option_a_en || q.option_a || '',
            option_b_en: q.option_b_en || q.option_b || '',
            option_c_en: q.option_c_en || q.option_c || '',
            option_d_en: q.option_d_en || q.option_d || '',
            option_a_hi: q.option_a_hi || '',
            option_b_hi: q.option_b_hi || '',
            option_c_hi: q.option_c_hi || '',
            option_d_hi: q.option_d_hi || '',
            correct_option: q.correct_option || 'a',
            explanation_en: q.explanation_en || q.explanation || '',
            explanation_hi: q.explanation_hi || '',
            difficulty: q.difficulty || 'moderate'
        }));

        this.questions.push(...newQuestions);
        this.save('questions', this.questions);

        // Update test question count
        const test = this.getTestById(testId);
        if (test) {
            this.updateTest(testId, {
                total_questions: this.getQuestionsByTestId(testId).length
            });
        }

        console.log(`✅ Added ${newQuestions.length} questions to test ${testId}`);
        return newQuestions;
    }

    importTestWithQuestions(importData) {
        // Create test first
        const test = this.createTest({
            name_en: importData.title_en || 'Imported Test',
            name_hi: importData.title_hi || '',
            subject: importData.subject || 'General',
            difficulty: importData.difficulty || 'moderate',
            questions: importData.questions?.length || 0,
            time: importData.time_limit_minutes || 120
        });

        // Add questions
        if (importData.questions && importData.questions.length > 0) {
            this.addQuestionsToTest(test.id, importData.questions);
        }

        return test;
    }

    // ===== SINGLE QUESTION MANAGEMENT =====

    addSingleQuestion(testId, questionData) {
        const existingQuestions = this.getQuestionsByTestId(testId);
        const nextNumber = existingQuestions.length + 1;

        const question = {
            id: this.generateId(),
            test_id: testId,
            question_number: questionData.question_number || nextNumber,
            question_text_en: questionData.question_text_en || questionData.question_text || questionData.question || '',
            question_text_hi: questionData.question_text_hi || '',
            option_a_en: questionData.option_a_en || questionData.option_a || '',
            option_b_en: questionData.option_b_en || questionData.option_b || '',
            option_c_en: questionData.option_c_en || questionData.option_c || '',
            option_d_en: questionData.option_d_en || questionData.option_d || '',
            option_a_hi: questionData.option_a_hi || '',
            option_b_hi: questionData.option_b_hi || '',
            option_c_hi: questionData.option_c_hi || '',
            option_d_hi: questionData.option_d_hi || '',
            correct_option: questionData.correct_option || 'a',
            explanation_en: questionData.explanation_en || questionData.explanation || '',
            explanation_hi: questionData.explanation_hi || '',
            difficulty: questionData.difficulty || 'moderate',
            created_at: new Date().toISOString()
        };

        this.questions.push(question);
        this.save('questions', this.questions);

        // Update test question count
        this.updateTest(testId, {
            total_questions: this.getQuestionsByTestId(testId).length
        });

        console.log(`✅ Added question #${question.question_number} to test ${testId}`);
        return question;
    }

    updateQuestion(questionId, updates) {
        const index = this.questions.findIndex(q => q.id === questionId);
        if (index !== -1) {
            this.questions[index] = {
                ...this.questions[index],
                ...updates,
                updated_at: new Date().toISOString()
            };
            this.save('questions', this.questions);
            console.log(`✅ Updated question ${questionId}`);
            return this.questions[index];
        }
        return null;
    }

    deleteQuestion(questionId) {
        const question = this.questions.find(q => q.id === questionId);
        if (!question) return false;

        const testId = question.test_id;
        const index = this.questions.findIndex(q => q.id === questionId);

        if (index !== -1) {
            this.questions.splice(index, 1);
            this.save('questions', this.questions);

            // Renumber remaining questions
            const remainingQuestions = this.getQuestionsByTestId(testId);
            remainingQuestions.forEach((q, i) => {
                q.question_number = i + 1;
            });
            this.save('questions', this.questions);

            // Update test question count
            this.updateTest(testId, {
                total_questions: remainingQuestions.length
            });

            console.log(`✅ Deleted question ${questionId}`);
            return true;
        }
        return false;
    }

    getQuestionById(questionId) {
        return this.questions.find(q => q.id === questionId);
    }

    // ===== TEST UTILITIES =====

    duplicateTest(testId) {
        const originalTest = this.getTestById(testId);
        if (!originalTest) return null;

        const originalQuestions = this.getQuestionsByTestId(testId);

        // Create new test with copied data
        const newTest = this.createTest({
            name_en: originalTest.name_en + ' (Copy)',
            name_hi: originalTest.name_hi ? originalTest.name_hi + ' (प्रति)' : '',
            subject: originalTest.subject_id,
            difficulty: originalTest.difficulty,
            questions: originalQuestions.length,
            time: originalTest.time_limit,
            mark_correct: originalTest.mark_correct,
            mark_wrong: originalTest.mark_wrong,
            source: originalTest.source,
            description: originalTest.description
        });

        // Copy questions
        if (originalQuestions.length > 0) {
            this.addQuestionsToTest(newTest.id, originalQuestions);
        }

        console.log(`✅ Duplicated test: ${newTest.name_en}`);
        return newTest;
    }

    exportTest(testId, format = 'json') {
        const test = this.getTestById(testId);
        if (!test) return null;

        const questions = this.getQuestionsByTestId(testId);

        const exportData = {
            test: {
                name_en: test.name_en,
                name_hi: test.name_hi,
                subject: test.subject_id,
                difficulty: test.difficulty,
                time_limit_minutes: test.time_limit,
                mark_correct: test.mark_correct,
                mark_wrong: test.mark_wrong,
                source: test.source,
                description: test.description
            },
            questions: questions.map(q => ({
                question_number: q.question_number,
                question_text_en: q.question_text_en,
                question_text_hi: q.question_text_hi,
                option_a_en: q.option_a_en,
                option_b_en: q.option_b_en,
                option_c_en: q.option_c_en,
                option_d_en: q.option_d_en,
                option_a_hi: q.option_a_hi,
                option_b_hi: q.option_b_hi,
                option_c_hi: q.option_c_hi,
                option_d_hi: q.option_d_hi,
                correct_option: q.correct_option,
                explanation_en: q.explanation_en,
                explanation_hi: q.explanation_hi,
                difficulty: q.difficulty
            })),
            exported_at: new Date().toISOString(),
            total_questions: questions.length
        };

        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        }

        return exportData;
    }

    // ===== ACCESS KEYS =====

    getAllKeys() {
        return this.accessKeys;
    }

    generateKeyString() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let key = '';
        for (let i = 0; i < 4; i++) {
            if (i > 0) key += '-';
            for (let j = 0; j < 4; j++) {
                key += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        }
        return key;
    }

    createKey() {
        const key = {
            id: this.generateId(),
            key: this.generateKeyString(),
            is_active: true,
            used: false,
            used_at: null,
            created_at: new Date().toISOString()
        };

        this.accessKeys.unshift(key);
        this.save('access_keys', this.accessKeys);

        // Also add to valid_keys for compatibility
        const validKeys = JSON.parse(localStorage.getItem('valid_keys') || '[]');
        if (!validKeys.includes(key.key)) {
            validKeys.push(key.key);
            localStorage.setItem('valid_keys', JSON.stringify(validKeys));
        }

        console.log('🔑 Key generated:', key.key);
        return key;
    }

    deleteKey(keyId) {
        const keyObj = this.accessKeys.find(k => k.id === keyId);
        if (keyObj) {
            // Remove from valid_keys
            const validKeys = JSON.parse(localStorage.getItem('valid_keys') || '[]');
            const idx = validKeys.indexOf(keyObj.key);
            if (idx !== -1) {
                validKeys.splice(idx, 1);
                localStorage.setItem('valid_keys', JSON.stringify(validKeys));
            }
        }

        const index = this.accessKeys.findIndex(k => k.id === keyId);
        if (index !== -1) {
            this.accessKeys.splice(index, 1);
            this.save('access_keys', this.accessKeys);
            return true;
        }
        return false;
    }

    // ===== STATS =====

    getStats() {
        return {
            totalTests: this.mockTests.length,
            totalQuestions: this.questions.length,
            totalKeys: this.accessKeys.length,
            activeKeys: this.accessKeys.filter(k => k.is_active).length
        };
    }
}

// Create global instance
window.adminData = new AdminDataManager();
console.log('✅ Admin Data Manager loaded');
