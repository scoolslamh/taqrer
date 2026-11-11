/* Shelter reports share the existing school session and upload identity flow. */
const SHELTER_PROCEDURES = [
  'توعية منسوبي المدرسة والطلبة بمفهوم الإنذار المبكر والفرق بينه وبين إنذار الحريق.',
  'تدريب الطلبة على وضعية حماية الرأس وإجراءات الاحتماء الآمن.',
  'تحديد مواقع الاحتماء الآمنة ونقطة التجمع المحمية داخل المدرسة.',
  'تحديد فريق الاستجابة للطوارئ وتوزيع الأدوار والمسؤوليات.',
  'التحقق من جاهزية وسائل الإنذار والإذاعة والإسعافات الأولية وتحديث بيانات التواصل.',
  'توعية أولياء الأمور بإجراءات الطوارئ وقنوات التواصل والاستلام الآمن للطلبة.',
  'تنفيذ تمرين فرضي لمحاكاة الإنذار المبكر وقياس زمن الاستجابة.',
  'توعية الطلبة بإجراءات ما بعد زوال الخطر وعدم الاقتراب من الأجسام الغريبة.'
];

const shelterPlanSelect = document.getElementById('evacuationPlanNumber');
['الأول', 'الثاني'].forEach((label, index) => {
  shelterPlanSelect.add(new Option(`خطة الاحتماء الفصل ${label}`, `shelter_${index + 1}`));
});
const shelterForm = document.createElement('form');
shelterForm.id = 'shelterForm';
shelterForm.className = 'evacuation-form';
shelterForm.innerHTML = `
  <h4 class="evacuation-form-title" id="shelterTitle">تقرير خطة الاحتماء</h4>
  <div id="shelterClosedMessage" class="message" role="status"></div>
  <fieldset id="shelterFields" style="border:0;padding:0;min-width:0">
    <div class="field"><label for="shelterDate">تاريخ تنفيذ التمرين</label><input id="shelterDate" type="date" required></div>
    <h4>أولًا: إجراءات التنفيذ</h4>
    ${SHELTER_PROCEDURES.map((label, index) => `
      <div class="field" style="margin-bottom:16px">
        <label for="shelterProcedure${index}">${index + 1}. ${label}</label>
        <select id="shelterProcedure${index}" required>
          <option value="">اختر حالة التنفيذ</option>
          <option>تم</option><option>جزئيًا</option><option>لم يتم</option>
        </select>
      </div>`).join('')}
    <h4>ثانيًا: نتائج التنفيذ</h4>
    <div class="report-form-grid">
      <div class="field"><label for="shelterParticipants">عدد المشاركين في التمرين الفرضي</label><input id="shelterParticipants" type="number" min="1" step="1" required></div>
      <fieldset style="border:1px solid #d7dfdc;border-radius:12px;padding:12px;min-width:0;margin:0">
        <legend>زمن الاستجابة</legend>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
          <div class="field"><label for="shelterMinutes">الدقائق</label><select id="shelterMinutes" required><option value="">اختر</option>${Array.from({ length: 61 }, (_, value) => `<option value="${value}">${value}</option>`).join('')}</select></div>
          <div class="field"><label for="shelterSeconds">الثواني</label><select id="shelterSeconds" required><option value="">اختر</option>${Array.from({ length: 60 }, (_, value) => `<option value="${value}">${value}</option>`).join('')}</select></div>
        </div>
      </fieldset>
    </div>
    <div class="field"><label for="shelterNotes">أبرز الملاحظات والإجراءات التحسينية</label><textarea id="shelterNotes" rows="3" maxlength="3000" required></textarea></div>
    <h4>ثالثًا: شواهد التنفيذ</h4>
    <p>إرفاق ملف PDF واحد يتضمن صورًا مختصرة للتوعية، وتحديد مواقع الاحتماء، وتنفيذ التمرين الفرضي، مع مراعاة ضوابط التصوير والخصوصية. الحد الأقصى 10 ميجابايت.</p>
    <div class="field"><label for="shelterFile">ملف شواهد التنفيذ</label><input id="shelterFile" type="file" accept="application/pdf,.pdf" required></div>
    <label><input id="shelterDeclaration" type="checkbox" required> إقرار مدير/ة المدرسة: أقر بصحة البيانات الواردة في التقرير، وتنفيذ الإجراءات المحددة وفق دليل التوعية والسلامة للبيئة المدرسية.</label>
    <div class="report-submit-actions"><button id="shelterSubmit" class="btn btn-primary" type="submit">رفع تقرير الاحتماء</button></div>
  </fieldset>
  <div id="shelterMessage" class="message" role="status"></div>
  <button id="shelterCancel" type="button" class="btn btn-secondary">إلغاء</button>
`;
evacuationForm.after(shelterForm);

function syncShelterForm() {
  const semester = Number(shelterPlanSelect.value.replace('shelter_', ''));
  const selected = shelterPlanSelect.value.startsWith('shelter_');
  evacuationForm.querySelectorAll('.field').forEach(field => {
    if (!field.contains(shelterPlanSelect)) field.style.display = selected ? 'none' : '';
  });
  evacuationForm.querySelectorAll('input,textarea,button[type="submit"]').forEach(field => {
    field.disabled = selected;
    field.hidden = selected;
  });
  evacuationForm.querySelector('.declaration-box').style.display = selected ? 'none' : '';
  evacuationSubmitButton.style.display = selected ? 'none' : '';
  shelterForm.classList.toggle('show', selected && evacuationForm.classList.contains('show'));
  if (selected) {
    const item = getReportWindow(`SHELTER_${semester}`);
    const message = getClosedReportWindowMessage(`SHELTER_${semester}`);
    document.getElementById('shelterTitle').textContent = item?.label || 'تقرير خطة الاحتماء';
    document.getElementById('shelterFields').disabled = Boolean(message);
    showMessage(document.getElementById('shelterClosedMessage'), message, 'error');
  }
}
shelterPlanSelect.addEventListener('change', syncShelterForm);
evacuationCancelButton.addEventListener('click', syncShelterForm);
document.querySelectorAll('.report-type-btn').forEach(button => button.addEventListener('click', syncShelterForm));
document.getElementById('shelterCancel').addEventListener('click', () => {
  shelterForm.reset();
  shelterPlanSelect.value = '';
  syncShelterForm();
  evacuationForm.classList.remove('show');
});
document.getElementById('logoutButton').addEventListener('click', () => {
  shelterForm.reset();
  shelterPlanSelect.value = '';
  syncShelterForm();
});

shelterForm.addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.getElementById('shelterMessage');
  const button = document.getElementById('shelterSubmit');
  if (button.disabled || !shelterForm.reportValidity() || !currentSchool) return;
  const semester = Number(shelterPlanSelect.value.replace('shelter_', ''));
  const closed = getClosedReportWindowMessage(`SHELTER_${semester}`);
  if (closed) { showMessage(message, closed, 'error'); return; }
  const file = document.getElementById('shelterFile').files[0];
  if (!file || !/\.pdf$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
    showMessage(message, 'يرجى إرفاق ملف PDF بحجم لا يتجاوز 10 ميجابايت.', 'error'); return;
  }
  const payload = {
    shelterSemester: semester,
    executionDate: document.getElementById('shelterDate').value,
    procedures: SHELTER_PROCEDURES.map((_, index) => document.getElementById(`shelterProcedure${index}`).value),
    participants: Number(document.getElementById('shelterParticipants').value),
    responseMinutes: Number(document.getElementById('shelterMinutes').value),
    responseSeconds: Number(document.getElementById('shelterSeconds').value),
    notes: document.getElementById('shelterNotes').value.trim(),
    declaration: document.getElementById('shelterDeclaration').checked
  };
  if (payload.responseMinutes * 60 + payload.responseSeconds < 1) {
    showMessage(message, 'زمن الاستجابة يجب أن يكون أكبر من صفر.', 'error'); return;
  }
  const action = 'uploadShelterReport';
  const requestId = getPendingUploadRequestId(action, createUploadFingerprint(action, payload, file));
  button.disabled = true;
  button.textContent = 'جاري الرفع...';
  try {
    const response = await fetch(API_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, action, uploadRequestId: requestId, loginNumber: currentSchool.loginNumber, fileName: file.name, mimeType: 'application/pdf', base64Data: await fileToBase64(file) })
    });
    if (!response.ok) throw new Error('تعذر الاتصال بالنظام.');
    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'تعذر رفع التقرير.');
    clearPendingUploadRequest(action, requestId);
    shelterForm.reset();
    showMessage(message, result.message, 'success');
    await refreshSchoolDashboardData();
  } catch (error) { showMessage(message, error.message || 'تعذر رفع التقرير.', 'error'); }
  finally { button.disabled = false; button.textContent = 'رفع تقرير الاحتماء'; }
});
