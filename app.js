/**
 * Main Application Logic
 * Handles all UI interactions and business logic
 */

// ==================== UTILITY FUNCTIONS ====================

function showSuccessMessage(message) {
    const container = document.querySelector('.form-container') || document.body;
    const div = document.createElement('div');
    div.className = 'success-message';
    div.style.animation = 'slideIn 0.5s ease';
    div.innerHTML = `<h3>✅ نجحت العملية!</h3><p>${message}</p>`;
    
    container.insertBefore(div, container.firstChild);
    
    setTimeout(() => {
        div.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => div.remove(), 500);
    }, 3000);
}

function showErrorMessage(message) {
    const container = document.querySelector('.form-container') || document.body;
    const div = document.createElement('div');
    div.className = 'error-message';
    div.style.animation = 'slideIn 0.5s ease';
    div.innerHTML = `<h3>❌ خطأ!</h3><p>${message}</p>`;
    
    container.insertBefore(div, container.firstChild);
    
    setTimeout(() => {
        div.style.animation = 'slideOut 0.5s ease';
        setTimeout(() => div.remove(), 500);
    }, 3000);
}

function showLoading() {
    const loader = document.createElement('div');
    loader.id = 'loader';
    loader.className = 'spinner';
    loader.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10000;
    `;
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.getElementById('loader');
    if (loader) loader.remove();
}

function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==================== GROUP MANAGEMENT ====================

async function loadGroups(selectId) {
    try {
        const groups = await db.getAllGroups();
        const select = document.getElementById(selectId);
        
        if (!select) return;
        
        // Clear existing options except first
        select.innerHTML = '<option value="">-- اختر مجموعة --</option>';
        
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            select.appendChild(option);
        });
        
        return groups;
    } catch (error) {
        console.error('Error loading groups:', error);
        showErrorMessage('فشل في تحميل المجموعات');
    }
}

async function createGroup(name) {
    if (!name || name.trim().length < 2) {
        showErrorMessage('اسم المجموعة غير صحيح (2-100 حرف)');
        return false;
    }
    
    try {
        showLoading();
        await db.addGroup(name.trim());
        hideLoading();
        showSuccessMessage(`تم إنشاء مجموعة "${name}" بنجاح`);
        return true;
    } catch (error) {
        hideLoading();
        if (error.name === 'ConstraintError') {
            showErrorMessage('المجموعة موجودة مسبقاً');
        } else {
            showErrorMessage('فشل في إنشاء المجموعة');
        }
        console.error('Error creating group:', error);
        return false;
    }
}

async function deleteGroup(groupId) {
    if (!confirm('⚠️ هل أنت متأكد من حذف هذه المجموعة؟\n\nسيتم حذف جميع الطلاب في هذه المجموعة!')) {
        return false;
    }
    
    try {
        showLoading();
        await db.deleteGroup(parseInt(groupId));
        hideLoading();
        showSuccessMessage('تم حذف المجموعة وجميع الطلاب فيها');
        return true;
    } catch (error) {
        hideLoading();
        showErrorMessage('فشل في حذف المجموعة');
        console.error('Error deleting group:', error);
        return false;
    }
}

async function displayExistingGroups(containerId) {
    try {
        const groups = await db.getAllGroups();
        const container = document.getElementById(containerId);
        
        if (!container || groups.length === 0) return;
        
        container.innerHTML = `
            <div style='margin-top: 2rem; padding: 1.5rem; background: var(--gray-50); border-radius: var(--radius-lg);'>
                <h3 style='color: var(--primary); margin-bottom: 1rem;'>📋 المجموعات الموجودة</h3>
                <ul style='list-style: none; padding: 0;'>
                    ${groups.map(group => `
                        <li style='padding: 0.75rem; margin: 0.5rem 0; background: white; border-radius: var(--radius); border-right: 3px solid var(--primary);'>
                            👥 ${sanitizeHTML(group.name)}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    } catch (error) {
        console.error('Error displaying groups:', error);
    }
}

// ==================== STUDENT MANAGEMENT ====================

async function addStudent(name, groupId, seance) {
    // Validation
    if (!name || name.trim().length < 2) {
        showErrorMessage('اسم الطالب غير صحيح (2-100 حرف)');
        return false;
    }
    
    if (!groupId || groupId < 1) {
        showErrorMessage('الرجاء اختيار مجموعة');
        return false;
    }
    
    if (!seance || seance < 1 || seance > 100) {
        showErrorMessage('رقم الحصة غير صحيح (1-100)');
        return false;
    }
    
    try {
        showLoading();
        
        // Verify group exists
        const group = await db.getGroup(parseInt(groupId));
        if (!group) {
            hideLoading();
            showErrorMessage('المجموعة غير موجودة');
            return false;
        }
        
        await db.addStudent(name.trim(), parseInt(groupId), parseInt(seance));
        hideLoading();
        showSuccessMessage(`تم إضافة الطالب "${name}" إلى مجموعة "${group.name}"`);
        return true;
    } catch (error) {
        hideLoading();
        showErrorMessage('فشل في إضافة الطالب');
        console.error('Error adding student:', error);
        return false;
    }
}

async function loadStudentsByGroup(groupId, containerId) {
    try {
        showLoading();
        const students = await db.getStudentsByGroup(parseInt(groupId));
        const group = await db.getGroup(parseInt(groupId));
        hideLoading();
        
        if (!group) {
            showErrorMessage('المجموعة غير موجودة');
            return;
        }
        
        const container = document.getElementById(containerId);
        if (!container) return;
        
        if (students.length === 0) {
            container.innerHTML = `
                <div class='error-message'>❌ لا يوجد طلاب في هذه المجموعة</div>
            `;
            return;
        }
        
        container.innerHTML = `
            <h3 style='color: var(--primary); text-align: center; margin: 1rem 0;'>
                المجموعة: ${sanitizeHTML(group.name)}
            </h3>
            <div id="student-list">
                ${students.map(student => `
                    <div class="student-item" data-id="${student.id}">
                        <label>
                            <input type="checkbox" name="student_${student.id}" value="${student.id}">
                            ${sanitizeHTML(student.name)} - الحصة: ${student.seance}
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        hideLoading();
        showErrorMessage('فشل في تحميل الطلاب');
        console.error('Error loading students:', error);
    }
}

async function deleteSelectedStudents(groupId) {
    const checkboxes = document.querySelectorAll('input[name^="student_"]:checked');
    
    if (checkboxes.length === 0) {
        showErrorMessage('الرجاء اختيار طالب واحد على الأقل');
        return false;
    }
    
    if (!confirm(`⚠️ هل أنت متأكد من حذف ${checkboxes.length} طالب؟`)) {
        return false;
    }
    
    try {
        showLoading();
        
        for (const checkbox of checkboxes) {
            const studentId = parseInt(checkbox.value);
            await db.deleteStudent(studentId);
        }
        
        hideLoading();
        showSuccessMessage(`تم حذف ${checkboxes.length} طالب بنجاح`);
        return true;
    } catch (error) {
        hideLoading();
        showErrorMessage('فشل في حذف الطلاب');
        console.error('Error deleting students:', error);
        return false;
    }
}

// ==================== ATTENDANCE MANAGEMENT ====================

async function processAttendance(groupId) {
    try {
        showLoading();
        const students = await db.getStudentsByGroup(parseInt(groupId));
        
        let absentCount = 0;
        let paymentCount = 0;
        
        // Update all students (increment seance by 1)
        for (const student of students) {
            await db.updateStudentSeance(student.id, 1);
        }
        
        // Process absences (decrement by 1)
        const absentCheckboxes = document.querySelectorAll('input[name^="elv"]:checked');
        for (const checkbox of absentCheckboxes) {
            const studentId = parseInt(checkbox.name.replace('elv', ''));
            await db.updateStudentSeance(studentId, -1);
            absentCount++;
        }
        
        // Process payments (decrement by 4)
        const paymentCheckboxes = document.querySelectorAll('input[name^="pay"]:checked');
        for (const checkbox of paymentCheckboxes) {
            const studentId = parseInt(checkbox.name.replace('pay', ''));
            await db.updateStudentSeance(studentId, -4);
            paymentCount++;
        }
        
        hideLoading();
        
        return {
            total: students.length,
            absent: absentCount,
            payment: paymentCount
        };
    } catch (error) {
        hideLoading();
        console.error('Error processing attendance:', error);
        throw error;
    }
}

// ==================== DATA MANAGEMENT ====================

async function exportAllData() {
    try {
        showLoading();
        const data = await db.exportData();
        hideLoading();
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kayel-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        showSuccessMessage('تم تصدير البيانات بنجاح');
    } catch (error) {
        hideLoading();
        showErrorMessage('فشل في تصدير البيانات');
        console.error('Error exporting data:', error);
    }
}

async function importDataFromFile(file) {
    try {
        showLoading();
        const text = await file.text();
        const data = JSON.parse(text);
        
        await db.importData(data);
        hideLoading();
        
        showSuccessMessage('تم استيراد البيانات بنجاح');
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        hideLoading();
        showErrorMessage('فشل في استيراد البيانات');
        console.error('Error importing data:', error);
    }
}

// ==================== INITIALIZATION ====================

// Make functions globally available
window.kayel = {
    loadGroups,
    createGroup,
    deleteGroup,
    displayExistingGroups,
    addStudent,
    loadStudentsByGroup,
    deleteSelectedStudents,
    processAttendance,
    exportAllData,
    importDataFromFile,
    showSuccessMessage,
    showErrorMessage
};

console.log('✅ Kayel App initialized');
