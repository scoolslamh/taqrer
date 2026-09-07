/**
 * =========================================================
 * APP - لوحة متابعة الأمن والسلامة المدرسية
 * =========================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  /*
   * =====================================================
   * عناصر الصفحة
   * =====================================================
   */

  const loginForm = document.getElementById('loginForm');
  const nationalIdInput = document.getElementById('nationalId');
  const loginButton = document.getElementById('loginButton');
  const loginButtonText = document.getElementById('loginButtonText');
  const loginLoader = document.getElementById('loginLoader');
  const loginMessage = document.getElementById('loginMessage');

  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  const supervisorDashboardContent =
    document.getElementById('supervisorDashboardContent');
  const adminDashboardContent =
    document.getElementById('adminDashboardContent');

  const userName = document.getElementById('userName');
  const userRole = document.getElementById('userRole');
  const logoutButton = document.getElementById('logoutButton');

  const schoolsCount = document.getElementById('schoolsCount');
  const averageProgress = document.getElementById('averageProgress');
  const completedSchools = document.getElementById('completedSchools');
  const pendingSchools = document.getElementById('pendingSchools');

  const evacuationPlanFilter =
    document.getElementById('evacuationPlanFilter');

  const reportTypeFilter =
    document.getElementById('reportTypeFilter');

  const evacuationPlanFilterField =
    document.getElementById('evacuationPlanFilterField');

  const evacuationStatusFilter =
    document.getElementById('evacuationStatusFilter');

  const reportFiltersResetButton =
    document.getElementById('reportFiltersResetButton');

  const schoolsResetFiltersButton =
    document.getElementById('schoolsResetFiltersButton');


  /*
   * =====================================================
   * التحقق من عناصر الصفحة
   * =====================================================
   */

  if (
    !loginForm ||
    !nationalIdInput ||
    !loginButton ||
    !loginMessage ||
    !loginView ||
    !dashboardView
  ) {
    console.error(
      'بعض عناصر واجهة تسجيل الدخول غير موجودة.'
    );

    return;
  }


  /*
   * =====================================================
   * الرسائل
   * =====================================================
   */

  function showMessage(
    message = '',
    type = 'error'
  ) {
    loginMessage.textContent = message;
    loginMessage.dataset.type = type;
  }


  /*
   * =====================================================
   * حالة زر تسجيل الدخول
   * =====================================================
   */

  function setLoginLoading(loading) {

    loginButton.disabled = loading;
    nationalIdInput.disabled = loading;

    if (loginButtonText) {
      loginButtonText.textContent =
        loading
          ? 'جاري التحقق...'
          : 'تسجيل الدخول';
    }

    if (loginLoader) {
      loginLoader.classList.toggle(
        'hidden',
        !loading
      );
    }
  }


  /*
   * =====================================================
   * شاشة تسجيل الدخول
   * =====================================================
   */

  function showLoginView() {

    loginView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    supervisorDashboardContent?.classList.remove(
      'hidden'
    );
    adminDashboardContent?.classList.add(
      'hidden'
    );

    showMessage('');
    setLoginLoading(false);
  }


  /*
   * =====================================================
   * وضع الإحصائيات في حالة تحميل
   * =====================================================
   */

  function setDashboardLoading() {

    if (schoolsCount) {
      schoolsCount.textContent = '...';
    }

    if (averageProgress) {
      averageProgress.textContent = '...';
    }

    if (completedSchools) {
      completedSchools.textContent = '...';
    }

    if (pendingSchools) {
      pendingSchools.textContent = '...';
    }
  }


  /*
   * =====================================================
   * استخراج بيانات المشرف من الجلسة
   * =====================================================
   */

  function getSupervisorNationalId(session) {

    return SafetyAuth.normalizeNationalId(
      session?.nationalId ||
      session?.nationalID ||
      session?.national_id ||
      ''
    );
  }


  /*
   * =====================================================
   * حساب إحصائيات المدارس
   * =====================================================
   */

  function calculateDashboardStats(schools) {

    const safeSchools =
      Array.isArray(schools)
        ? schools
        : [];

    const total =
      safeSchools.length;

    if (total === 0) {
      return {
        total: 0,
        average: 0,
        completed: 0,
        pending: 0
      };
    }


    let percentageSum = 0;
    let completed = 0;


    safeSchools.forEach(school => {

      const percentage =
        Number(
          school?.achievement?.percentage
        ) || 0;

      percentageSum += percentage;

      if (percentage >= 100) {
        completed++;
      }
    });


    const average =
      Math.round(
        percentageSum / total
      );


    return {
      total,
      average,
      completed,
      pending: total - completed
    };
  }


  /*
   * =====================================================
   * عرض الإحصائيات
   * =====================================================
   */

  function renderDashboardStats(
    schools,
    totalSchools
  ) {

    const stats =
      calculateDashboardStats(
        schools
      );


    /*
     * نستخدم totalSchools القادم من الخادم
     * إن كان موجودًا، وإلا نستخدم طول المصفوفة.
     */

    const totalFromServer =
      Number(totalSchools);

    const total =
      Number.isFinite(totalFromServer)
        ? totalFromServer
        : stats.total;


    if (schoolsCount) {
      schoolsCount.textContent =
        String(total);
    }


    if (averageProgress) {
      averageProgress.textContent =
        `${stats.average}%`;
    }


    if (completedSchools) {
      completedSchools.textContent =
        String(stats.completed);
    }


    if (pendingSchools) {
      pendingSchools.textContent =
        String(stats.pending);
    }
  }

 /*
 * =====================================================
 * عرض المدارس
 * =====================================================
 */

let supervisorSchools = [];
let adminSchools = [];
let adminSupervisors = [];
let adminSummary = {};
let selectedAdminSupervisorId = null;
let currentDashboardSession = null;
let currentSchoolsFilter = 'all';
let currentReportTypeFilter = 'all';
let currentEvacuationPlanFilter = 'all';
let currentEvacuationStatusFilter = 'all';

const EVACUATION_PLAN_NUMBERS =
  [1, 2, 3, 4];

const EVACUATION_PLAN_LABELS = {
  1: 'خطة الإخلاء الأولى',
  2: 'خطة الإخلاء الثانية',
  3: 'خطة الإخلاء الثالثة',
  4: 'خطة الإخلاء الرابعة'
};

const REPORT_TYPE_LABELS = {
  safetyMoment: 'لحظة سلامة',
  civilDefense:
    'اليوم العالمي للدفاع المدني',
  trafficWeek: 'أسبوع المرور'
};


function getSchoolPercentage(school) {

  const percentage =
    Number(
      school?.achievement?.percentage
    );

  if (!Number.isFinite(percentage)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, percentage)
  );
}


/*
 * منع إدخال HTML من البيانات القادمة من الخادم
 */
function escapeHTML(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/*
 * تحديث أعداد أزرار التصفية
 */
function updateSchoolFilterCounts() {

  const allCount =
    supervisorSchools.length;

  const completedCount =
    supervisorSchools.filter(
      school =>
        getSchoolPercentage(school) >= 100
    ).length;

  const pendingCount =
    allCount - completedCount;


  const allElement =
    document.getElementById(
      'allSchoolsFilterCount'
    );

  const completedElement =
    document.getElementById(
      'completedSchoolsFilterCount'
    );

  const pendingElement =
    document.getElementById(
      'pendingSchoolsFilterCount'
    );


  if (allElement) {
    allElement.textContent = allCount;
  }

  if (completedElement) {
    completedElement.textContent =
      completedCount;
  }

  if (pendingElement) {
    pendingElement.textContent =
      pendingCount;
  }
}


/*
 * قراءة حالة خطط الإخلاء بأمان
 */
function getEvacuationPlans(school) {

  const plans =
    school?.achievement?.evacuation?.plans;

  return plans &&
    typeof plans === 'object'
      ? plans
      : {};
}


function isEvacuationPlanUploaded(
  school,
  planNumber
) {

  return getEvacuationPlans(school)[
    planNumber
  ] === true;
}


/*
 * تطبيق فلتر الإنجاز العام فقط
 */
function getGenerallyFilteredSchools() {

  if (
    currentSchoolsFilter ===
    'completed'
  ) {

    return supervisorSchools.filter(
      school =>
        getSchoolPercentage(school) >= 100
    );
  }


  if (
    currentSchoolsFilter ===
    'pending'
  ) {

    return supervisorSchools.filter(
      school =>
        getSchoolPercentage(school) < 100
    );
  }


  return supervisorSchools;
}


function getReportProgress(
  school,
  reportType
) {

  const report =
    school?.achievement?.[reportType];

  const completedValue =
    Number(report?.completed);

  const targetValue =
    Number(report?.target);

  return {
    completed:
      Number.isFinite(completedValue)
        ? Math.max(0, completedValue)
        : 0,
    target:
      Number.isFinite(targetValue)
        ? Math.max(0, targetValue)
        : 0
  };
}


function isAllEvacuationPlansCompleted(
  school
) {

  return EVACUATION_PLAN_NUMBERS.every(
    planNumber =>
      isEvacuationPlanUploaded(
        school,
        planNumber
      )
  );
}


function isReportCompleted(
  school,
  reportType
) {

  if (reportType === 'evacuation') {
    return isAllEvacuationPlansCompleted(
      school
    );
  }

  const progress =
    getReportProgress(
      school,
      reportType
    );

  return progress.target > 0 &&
    progress.completed >= progress.target;
}


function isAllReportsCompleted(school) {

  return isAllEvacuationPlansCompleted(
    school
  ) &&
    isReportCompleted(
      school,
      'safetyMoment'
    ) &&
    isReportCompleted(
      school,
      'civilDefense'
    ) &&
    isReportCompleted(
      school,
      'trafficWeek'
    );
}


/*
 * مطابقة فلتر نوع التقرير والحالة
 */
function matchesReportFilter(
  school,
  filters = {}
) {

  const statusFilter =
    filters.status ||
    currentEvacuationStatusFilter;

  if (
    statusFilter === 'all'
  ) {
    return true;
  }

  const isCompleted =
    isSelectedReportCompleted(
      school,
      filters
    );

  return statusFilter === 'uploaded'
      ? isCompleted
      : !isCompleted;
}


/*
 * دمج الفلاتر العامة مع فلاتر الإخلاء
 */
function getFilteredSchools() {

  return getGenerallyFilteredSchools()
    .filter(matchesReportFilter);
}


function isSelectedReportCompleted(
  school,
  filters = {}
) {

  const reportType =
    filters.reportType ||
    currentReportTypeFilter;

  const evacuationPlan =
    filters.evacuationPlan ||
    currentEvacuationPlanFilter;

  if (reportType === 'all') {
    return isAllReportsCompleted(school);
  }

  if (
    reportType === 'evacuation'
  ) {
    return evacuationPlan === 'all'
        ? isAllEvacuationPlansCompleted(
            school
          )
        : isEvacuationPlanUploaded(
            school,
            Number(
              evacuationPlan
            )
          );
  }

  return isReportCompleted(
    school,
    reportType
  );
}


function calculateReportStats(schools) {

  const safeSchools =
    Array.isArray(schools)
      ? schools
      : [];

  const completed =
    safeSchools.filter(
      isSelectedReportCompleted
    ).length;

  return {
    completed,
    pending:
      safeSchools.length - completed,
    total:
      safeSchools.length
  };
}


function renderReportSummary() {

  const stats =
    calculateReportStats(
      getGenerallyFilteredSchools()
    );

  const title =
    document.getElementById(
      'evacuationSummaryTitle'
    );

  const uploadedLabel =
    document.getElementById(
      'evacuationUploadedLabel'
    );

  const notUploadedLabel =
    document.getElementById(
      'evacuationNotUploadedLabel'
    );

  const uploadedCount =
    document.getElementById(
      'evacuationUploadedCount'
    );

  const notUploadedCount =
    document.getElementById(
      'evacuationNotUploadedCount'
    );

  const totalCount =
    document.getElementById(
      'evacuationTotalCount'
    );

  let summaryTitle;
  let completedLabel;
  let pendingLabel;

  if (currentReportTypeFilter === 'all') {
    summaryTitle = 'الإنجاز العام';
    completedLabel =
      'مكتملة جميع المتطلبات';
    pendingLabel = 'تحتاج متابعة';

  } else if (
    currentReportTypeFilter ===
    'evacuation'
  ) {
    const allPlansSelected =
      currentEvacuationPlanFilter ===
      'all';

    summaryTitle = allPlansSelected
      ? 'خطط الإخلاء الأربع'
      : EVACUATION_PLAN_LABELS[
          currentEvacuationPlanFilter
        ];

    completedLabel = allPlansSelected
      ? 'مكتملة جميع الخطط'
      : 'تم الرفع';

    pendingLabel = allPlansSelected
      ? 'تحتاج استكمال'
      : 'لم يتم الرفع';

  } else {
    summaryTitle =
      REPORT_TYPE_LABELS[
        currentReportTypeFilter
      ];

    const usesCompletionLabels =
      currentReportTypeFilter ===
      'safetyMoment';

    completedLabel = usesCompletionLabels
      ? 'مكتملة'
      : 'تم الرفع';

    pendingLabel = usesCompletionLabels
      ? 'تحتاج استكمال'
      : 'لم يتم الرفع';
  }

  if (title) {
    title.textContent = summaryTitle;
  }

  if (uploadedLabel) {
    uploadedLabel.textContent =
      completedLabel;
  }

  if (notUploadedLabel) {
    notUploadedLabel.textContent =
      pendingLabel;
  }

  if (uploadedCount) {
    uploadedCount.textContent =
      String(stats.completed);
  }

  if (notUploadedCount) {
    notUploadedCount.textContent =
      String(stats.pending);
  }

  if (totalCount) {
    totalCount.textContent =
      String(stats.total);
  }
}


/*
 * بطاقة البرنامج
 */
function createRequirementHTML(
  label,
  requirement
) {

  const completed =
    Number(
      requirement?.completed
    ) || 0;

  const target =
    Number(
      requirement?.target
    ) || 0;

  const isCompleted =
    target > 0 &&
    completed >= target;


  return `
    <div class="requirement-item">

      <span class="requirement-name">
        ${escapeHTML(label)}
      </span>

      <span class="${
        isCompleted
          ? 'requirement-value completed'
          : 'requirement-value'
      }">
        ${completed} / ${target}
      </span>

    </div>
  `;
}


function createEvacuationPlansHTML(school) {

  const rows =
    EVACUATION_PLAN_NUMBERS.map(
      planNumber => {

        const uploaded =
          isEvacuationPlanUploaded(
            school,
            planNumber
          );

        const selected =
          currentEvacuationPlanFilter ===
          String(planNumber);

        return `
          <div class="evacuation-plan-row${
            selected ? ' selected' : ''
          }">
            <span>
              ${EVACUATION_PLAN_LABELS[planNumber]}
            </span>
            <span class="evacuation-plan-state ${
              uploaded
                ? 'uploaded'
                : 'not-uploaded'
            }">
              ${
                uploaded
                  ? '✓ تم الرفع'
                  : '✕ لم يتم الرفع'
              }
            </span>
          </div>
        `;
      }
    ).join('');

  return `
    <div class="evacuation-plans-detail">
      <div class="evacuation-plans-title">
        تفاصيل خطط الإخلاء
      </div>
      ${rows}
    </div>
  `;
}


function renderSelectedReportDetails(school) {

  if (currentReportTypeFilter === 'all') {
    return '';
  }

  if (
    currentReportTypeFilter ===
    'evacuation'
  ) {
    return createEvacuationPlansHTML(
      school
    );
  }

  const progress =
    getReportProgress(
      school,
      currentReportTypeFilter
    );

  const completed =
    isReportCompleted(
      school,
      currentReportTypeFilter
    );

  const remaining =
    Math.max(
      0,
      progress.target -
      progress.completed
    );

  const reportLabel =
    REPORT_TYPE_LABELS[
      currentReportTypeFilter
    ];

  const statusText =
    currentReportTypeFilter ===
    'safetyMoment'
      ? (
          completed
            ? 'مكتمل'
            : 'يحتاج استكمال'
        )
      : (
          completed
            ? 'تم الرفع'
            : 'لم يتم الرفع'
        );

  return `
    <div class="selected-report-detail">
      <h5>${escapeHTML(reportLabel)}</h5>
      <div class="selected-report-values">
        <span>
          المنجز: ${progress.completed}
        </span>
        <span>
          المستهدف: ${progress.target}
        </span>
        ${
          currentReportTypeFilter ===
          'safetyMoment'
            ? `
              <span>
                المتبقي: ${remaining}
              </span>
            `
            : ''
        }
      </div>
      <div class="selected-report-status ${
        completed
          ? 'completed'
          : 'pending'
      }">
        الحالة: ${statusText}
      </div>
    </div>
  `;
}


/*
 * إنشاء بطاقة مدرسة
 */
function createSchoolCard(school, index) {

  const achievement =
    school?.achievement || {};

  const percentage =
    getSchoolPercentage(school);

  const completed =
    percentage >= 100;


  const schoolName =
    school?.schoolName ||
    'مدرسة بدون اسم';


  const governorate =
    school?.governorate || '';


  const city =
    school?.city || '';


  const statisticalNumbers =
    Array.isArray(
      school?.statisticalNumbers
    )
      ? school.statisticalNumbers
      : [];


  const locationParts =
    [governorate, city]
      .filter(Boolean);


  const location =
    locationParts.join(' - ');


  return `
    <article
      class="school-card"
      data-status="${
        completed
          ? 'completed'
          : 'pending'
      }"
    >

      <div class="school-row-number" aria-label="المدرسة رقم ${index + 1}">
        ${index + 1}
      </div>

      <div class="school-card-header">

        <div class="school-title">

          <h4>
            ${escapeHTML(schoolName)}
          </h4>

          ${
            location
              ? `
                <p>
                  ${escapeHTML(location)}
                </p>
              `
              : ''
          }

        </div>


        <span class="${
          completed
            ? 'school-status completed'
            : 'school-status pending'
        }">

          ${
            completed
              ? 'مكتملة'
              : 'تحتاج متابعة'
          }

        </span>

      </div>


      <div class="school-progress-row">

        <div>

          <span>
            نسبة الإنجاز
          </span>

          <strong>
            ${percentage}%
          </strong>

        </div>


        <div class="progress-track">

          <div
            class="progress-bar"
            style="width: ${percentage}%"
          ></div>

        </div>

      </div>


      <div class="requirements-grid">

        ${createRequirementHTML(
          'خطط الإخلاء',
          achievement.evacuation
        )}

        ${createRequirementHTML(
          'لحظة سلامة',
          achievement.safetyMoment
        )}

        ${createRequirementHTML(
          'الدفاع المدني',
          achievement.civilDefense
        )}

        ${createRequirementHTML(
          'أسبوع المرور',
          achievement.trafficWeek
        )}

      </div>


      ${renderSelectedReportDetails(school)}

      ${
        school?.supervisorName
          ? `
            <div class="school-supervisor">
              المشرف المسؤول:
              <strong>${escapeHTML(
                school.supervisorName
              )}</strong>
            </div>
          `
          : ''
      }


      ${
        statisticalNumbers.length
          ? `
            <div class="school-numbers">
              الرقم الإحصائي:
              ${escapeHTML(
                statisticalNumbers.join(' - ')
              )}
            </div>
          `
          : ''
      }

    </article>
  `;
}


const schoolListRenderTokens =
  new WeakMap();


function renderSchoolCardsProgressively(
  container,
  schools
) {

  const token = {};
  const chunkSize = 40;
  let startIndex = 0;

  schoolListRenderTokens.set(
    container,
    token
  );

  container.innerHTML = '';

  function renderNextChunk() {

    if (
      schoolListRenderTokens.get(container) !==
      token
    ) {
      return;
    }

    const chunk = schools.slice(
      startIndex,
      startIndex + chunkSize
    );

    container.insertAdjacentHTML(
      'beforeend',
      chunk
        .map((school, index) =>
          createSchoolCard(
            school,
            startIndex + index
          )
        )
        .join('')
    );

    startIndex += chunk.length;

    if (startIndex < schools.length) {
      requestAnimationFrame(
        renderNextChunk
      );
    }
  }

  renderNextChunk();
}


/*
 * عرض قائمة المدارس
 */
function renderSchools() {

  const schoolsList =
    document.getElementById(
      'schoolsList'
    );

  const schoolsEmpty =
    document.getElementById(
      'schoolsEmpty'
    );

  const schoolsEmptyTitle =
    document.getElementById(
      'schoolsEmptyTitle'
    );

  const schoolsEmptyMessage =
    document.getElementById(
      'schoolsEmptyMessage'
    );


  if (!schoolsList) {
    return;
  }

  renderReportSummary();


  const schools =
    getFilteredSchools();

  const reportFiltersActive =
    currentReportTypeFilter !== 'all' ||
    (
      currentReportTypeFilter ===
        'evacuation' &&
      currentEvacuationPlanFilter !==
        'all'
    ) ||
    currentEvacuationStatusFilter !== 'all';


  schoolsList.innerHTML = '';


  if (schools.length === 0) {

    schoolsEmpty?.classList.remove(
      'hidden'
    );


    schoolsResetFiltersButton?.classList.toggle(
      'hidden',
      !reportFiltersActive
    );


    if (reportFiltersActive) {

      if (schoolsEmptyTitle) {
        schoolsEmptyTitle.textContent =
          'لا توجد نتائج مطابقة';
      }

      if (schoolsEmptyMessage) {
        schoolsEmptyMessage.textContent =
          'لا توجد مدارس مطابقة لخيارات المتابعة الحالية.';
      }

      return;
    }


    if (
      currentSchoolsFilter ===
      'completed'
    ) {

      if (schoolsEmptyTitle) {
        schoolsEmptyTitle.textContent =
          'لا توجد مدارس مكتملة';
      }

      if (schoolsEmptyMessage) {
        schoolsEmptyMessage.textContent =
          'لم تصل أي مدرسة إلى 100% حتى الآن.';
      }

    } else if (
      currentSchoolsFilter ===
      'pending'
    ) {

      if (schoolsEmptyTitle) {
        schoolsEmptyTitle.textContent =
          'لا توجد مدارس تحتاج متابعة';
      }

      if (schoolsEmptyMessage) {
        schoolsEmptyMessage.textContent =
          'جميع المدارس استكملت المتطلبات.';
      }

    } else {

      if (schoolsEmptyTitle) {
        schoolsEmptyTitle.textContent =
          'لا توجد مدارس مسندة';
      }

      if (schoolsEmptyMessage) {
        schoolsEmptyMessage.textContent =
          'لم يتم العثور على مدارس مرتبطة بهذا المشرف.';
      }
    }

    return;
  }


  schoolsEmpty?.classList.add(
    'hidden'
  );

  schoolsResetFiltersButton?.classList.add(
    'hidden'
  );


  renderSchoolCardsProgressively(
    schoolsList,
    schools
  );
}


/*
 * أزرار تصفية المدارس
 */
document
  .querySelectorAll(
    '.school-filter'
  )
  .forEach(button => {

    button.addEventListener(
      'click',
      () => {

        currentSchoolsFilter =
          button.dataset.filter ||
          'all';


        document
          .querySelectorAll(
            '.school-filter'
          )
          .forEach(item => {

            item.classList.toggle(
              'active',
              item === button
            );
          });


        renderSchools();
      }
    );
  });


function syncReportFilterVisibility() {

  const showEvacuationPlan =
    currentReportTypeFilter ===
    'evacuation';

  evacuationPlanFilterField?.classList.toggle(
    'hidden',
    !showEvacuationPlan
  );

  evacuationPlanFilterField?.parentElement
    ?.classList.toggle(
      'without-plan',
      !showEvacuationPlan
    );
}


function resetReportFilters() {

  currentReportTypeFilter = 'all';
  currentEvacuationPlanFilter = 'all';
  currentEvacuationStatusFilter = 'all';

  if (reportTypeFilter) {
    reportTypeFilter.value = 'all';
  }

  if (evacuationPlanFilter) {
    evacuationPlanFilter.value = 'all';
  }

  if (evacuationStatusFilter) {
    evacuationStatusFilter.value = 'all';
  }

  syncReportFilterVisibility();
  renderSchools();
}


if (reportTypeFilter) {
  reportTypeFilter.addEventListener(
    'change',
    () => {
      currentReportTypeFilter =
        reportTypeFilter.value;

      syncReportFilterVisibility();
      renderSchools();
    }
  );
}


if (evacuationPlanFilter) {
  evacuationPlanFilter.addEventListener(
    'change',
    () => {
      currentEvacuationPlanFilter =
        evacuationPlanFilter.value;

      renderSchools();
    }
  );
}


if (evacuationStatusFilter) {
  evacuationStatusFilter.addEventListener(
    'change',
    () => {
      currentEvacuationStatusFilter =
        evacuationStatusFilter.value;

      renderSchools();
    }
  );
}


if (schoolsResetFiltersButton) {
  schoolsResetFiltersButton.addEventListener(
    'click',
    resetReportFilters
  );
}


if (reportFiltersResetButton) {
  reportFiltersResetButton.addEventListener(
    'click',
    resetReportFilters
  );
}


  /*
   * =====================================================
   * لوحة مدير النظام
   * =====================================================
   */

  const adminLoading =
    document.getElementById('adminLoading');
  const adminError =
    document.getElementById('adminError');
  const adminErrorMessage =
    document.getElementById('adminErrorMessage');
  const adminDashboardBody =
    document.getElementById('adminDashboardBody');
  const adminSupervisorsPanel =
    document.getElementById('adminSupervisorsPanel');
  const adminSchoolsPanel =
    document.getElementById('adminSchoolsPanel');

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = String(value);
    }
  }


  function resetAdminSchoolFilters() {

    const defaults = {
      adminSchoolSupervisorFilter: 'all',
      adminGovernorateFilter: 'all',
      adminReportTypeFilter: 'all',
      adminEvacuationPlanFilter: 'all',
      adminReportStatusFilter: 'all'
    };

    Object.entries(defaults).forEach(
      ([id, value]) => {
        const field = document.getElementById(id);
        if (field) {
          field.value = value;
        }
      }
    );

    document
      .querySelectorAll('.admin-school-filter')
      .forEach(button => {
        button.classList.toggle(
          'active',
          button.dataset.filter === 'all'
        );
      });

    document
      .getElementById(
        'adminEvacuationPlanFilterField'
      )
      ?.classList.add('hidden');
  }


  function clearAdminState() {
    adminSchools = [];
    adminSupervisors = [];
    adminSummary = {};
    selectedAdminSupervisorId = null;

    const supervisorsBody =
      document.getElementById(
        'adminSupervisorsTableBody'
      );
    const schoolsList =
      document.getElementById(
        'adminSchoolsList'
      );

    if (supervisorsBody) {
      supervisorsBody.innerHTML = '';
    }
    if (schoolsList) {
      schoolListRenderTokens.set(
        schoolsList,
        {}
      );
      schoolsList.innerHTML = '';
    }

    resetAdminSchoolFilters();
  }


  function setAdminLoading() {
    adminLoading?.classList.remove('hidden');
    adminError?.classList.add('hidden');
    adminDashboardBody?.classList.add('hidden');
  }


  function setAdminError(error) {
    adminLoading?.classList.add('hidden');
    adminDashboardBody?.classList.add('hidden');
    adminError?.classList.remove('hidden');

    if (adminErrorMessage) {
      adminErrorMessage.textContent =
        error?.message ||
        'يرجى المحاولة مرة أخرى.';
    }
  }


  function renderAdminStats() {
    setText(
      'adminSupervisorsCount',
      adminSummary.totalSupervisors || 0
    );
    setText(
      'adminSchoolsCount',
      adminSummary.totalSchools || 0
    );
    setText(
      'adminAverageAchievement',
      `${Number(
        adminSummary.averageAchievement
      ) || 0}%`
    );
    setText(
      'adminCompletedSchools',
      adminSummary.completedSchools || 0
    );
    setText(
      'adminPendingSchools',
      adminSummary.pendingSchools || 0
    );
    setText(
      'adminUnassignedSchools',
      adminSummary.unassignedSchools || 0
    );
  }


  function getFilteredAdminSupervisors() {

    const search = String(
      document.getElementById(
        'adminSupervisorSearch'
      )?.value || ''
    ).trim().toLocaleLowerCase('ar');

    const status =
      document.getElementById(
        'adminSupervisorStatusFilter'
      )?.value || 'all';

    const sort =
      document.getElementById(
        'adminSupervisorSort'
      )?.value || 'achievement-asc';

    const result = adminSupervisors.filter(
      supervisor => {
        const matchesSearch =
          !search ||
          String(
            supervisor.supervisorName || ''
          ).toLocaleLowerCase('ar')
            .includes(search);

        const isCompleted =
          supervisor.achievementStatus ===
          'مكتمل';

        const matchesStatus =
          status === 'all' ||
          (
            status === 'completed'
              ? isCompleted
              : !isCompleted
          );

        return matchesSearch && matchesStatus;
      }
    );

    result.sort((a, b) => {
      if (sort === 'name') {
        return String(
          a.supervisorName || ''
        ).localeCompare(
          String(b.supervisorName || ''),
          'ar'
        );
      }

      const difference =
        Number(a.averageAchievement || 0) -
        Number(b.averageAchievement || 0);

      const achievementOrder =
        sort === 'achievement-desc'
          ? -difference
          : difference;

      return achievementOrder ||
        String(a.supervisorName || '')
          .localeCompare(
            String(b.supervisorName || ''),
            'ar'
          );
    });

    return result;
  }


  function renderAdminSupervisors() {

    const body = document.getElementById(
      'adminSupervisorsTableBody'
    );
    const empty = document.getElementById(
      'adminSupervisorsEmpty'
    );

    if (!body) {
      return;
    }

    const supervisors =
      getFilteredAdminSupervisors();

    body.innerHTML = '';
    empty?.classList.toggle(
      'hidden',
      supervisors.length > 0
    );

    supervisors.forEach(supervisor => {

      const percentage = Math.max(
        0,
        Math.min(
          100,
          Number(
            supervisor.averageAchievement
          ) || 0
        )
      );

      const row = document.createElement('tr');
      row.innerHTML = `
        <td data-label="المشرف">
          <strong>${escapeHTML(
            supervisor.supervisorName ||
            'مشرف بدون اسم'
          )}</strong>
          <small>${escapeHTML(
            supervisor.status || ''
          )}</small>
        </td>
        <td data-label="عدد المدارس">
          ${Number(supervisor.totalSchools) || 0}
        </td>
        <td data-label="نسبة الإنجاز">
          <div class="admin-progress-value">
            <span>${percentage}%</span>
            <div class="progress-track">
              <div class="progress-bar" style="width: ${percentage}%"></div>
            </div>
          </div>
        </td>
        <td data-label="المدارس المكتملة">
          ${Number(supervisor.completedSchools) || 0}
        </td>
        <td data-label="تحتاج متابعة">
          ${Number(supervisor.pendingSchools) || 0}
        </td>
        <td data-label="الحالة">
          <span class="school-status ${
            supervisor.achievementStatus ===
            'مكتمل'
              ? 'completed'
              : 'pending'
          }">
            ${escapeHTML(
              supervisor.achievementStatus ||
              'يحتاج متابعة'
            )}
          </span>
        </td>
        <td data-label="الإجراء"></td>
      `;

      const button = document.createElement(
        'button'
      );
      button.type = 'button';
      button.className =
        'reset-filters-button table-action';
      button.textContent = 'عرض المدارس';
      button.addEventListener('click', () => {
        showAdminSchools(
          supervisor.supervisorId
        );
      });

      row.lastElementChild.appendChild(button);
      body.appendChild(row);
    });
  }


  function populateAdminSchoolFilters() {

    const supervisorSelect =
      document.getElementById(
        'adminSchoolSupervisorFilter'
      );
    const governorateSelect =
      document.getElementById(
        'adminGovernorateFilter'
      );

    if (supervisorSelect) {
      supervisorSelect.innerHTML = '';

      const allOption =
        document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = 'جميع المشرفين';
      supervisorSelect.appendChild(allOption);

      adminSupervisors
        .slice()
        .sort((a, b) =>
          String(a.supervisorName || '')
            .localeCompare(
              String(b.supervisorName || ''),
              'ar'
            )
        )
        .forEach(supervisor => {
          const option =
            document.createElement('option');
          option.value = supervisor.supervisorId;
          option.textContent =
            supervisor.supervisorName ||
            'مشرف بدون اسم';
          supervisorSelect.appendChild(option);
        });

      const unassignedOption =
        document.createElement('option');
      unassignedOption.value = 'unassigned';
      unassignedOption.textContent = 'غير مسندة';
      supervisorSelect.appendChild(
        unassignedOption
      );
    }

    if (governorateSelect) {
      governorateSelect.innerHTML = '';

      const allOption =
        document.createElement('option');
      allOption.value = 'all';
      allOption.textContent =
        'جميع المحافظات';
      governorateSelect.appendChild(allOption);

      Array.from(
        new Set(
          adminSchools
            .map(school =>
              String(
                school.governorate || ''
              ).trim()
            )
            .filter(Boolean)
        )
      )
        .sort((a, b) =>
          a.localeCompare(b, 'ar')
        )
        .forEach(governorate => {
          const option =
            document.createElement('option');
          option.value = governorate;
          option.textContent = governorate;
          governorateSelect.appendChild(option);
        });
    }
  }


  function getFilteredAdminSchools() {

    const schoolStatus =
      document.querySelector(
        '.admin-school-filter.active'
      )?.dataset.filter || 'all';
    const supervisorFilter =
      document.getElementById(
        'adminSchoolSupervisorFilter'
      )?.value || 'all';
    const governorateFilter =
      document.getElementById(
        'adminGovernorateFilter'
      )?.value || 'all';
    const reportType =
      document.getElementById(
        'adminReportTypeFilter'
      )?.value || 'all';
    const evacuationPlan =
      document.getElementById(
        'adminEvacuationPlanFilter'
      )?.value || 'all';
    const reportStatus =
      document.getElementById(
        'adminReportStatusFilter'
      )?.value || 'all';

    return adminSchools.filter(school => {

      if (
        selectedAdminSupervisorId &&
        school.supervisorId !==
          selectedAdminSupervisorId
      ) {
        return false;
      }

      const percentage =
        getSchoolPercentage(school);

      if (
        schoolStatus === 'completed' &&
        percentage < 100
      ) {
        return false;
      }

      if (
        schoolStatus === 'pending' &&
        percentage >= 100
      ) {
        return false;
      }

      if (
        supervisorFilter !== 'all' &&
        (
          supervisorFilter === 'unassigned'
            ? Boolean(school.supervisorId)
            : school.supervisorId !==
              supervisorFilter
        )
      ) {
        return false;
      }

      if (
        governorateFilter !== 'all' &&
        school.governorate !==
          governorateFilter
      ) {
        return false;
      }

      return matchesReportFilter(
        school,
        {
          reportType,
          evacuationPlan,
          status: reportStatus
        }
      );
    });
  }


  function renderAdminSchools() {

    const list = document.getElementById(
      'adminSchoolsList'
    );
    const empty = document.getElementById(
      'adminSchoolsEmpty'
    );

    if (!list) {
      return;
    }

    const reportType =
      document.getElementById(
        'adminReportTypeFilter'
      )?.value || 'all';
    const evacuationPlan =
      document.getElementById(
        'adminEvacuationPlanFilter'
      )?.value || 'all';

    // createSchoolCard يعيد استخدام العرض الحالي، وهذه
    // القيم تجعله يعرض تفاصيل التقرير المختار للمدير.
    currentReportTypeFilter = reportType;
    currentEvacuationPlanFilter =
      evacuationPlan;

    const schools = getFilteredAdminSchools();

    renderSchoolCardsProgressively(
      list,
      schools
    );

    empty?.classList.toggle(
      'hidden',
      schools.length > 0
    );
  }


  function showAdminSupervisors() {
    selectedAdminSupervisorId = null;
    adminSchoolsPanel?.classList.add('hidden');
    adminSupervisorsPanel?.classList.remove(
      'hidden'
    );
    renderAdminSupervisors();
  }


  function showAdminSchools(supervisorId = null) {

    selectedAdminSupervisorId =
      supervisorId || null;

    adminSupervisorsPanel?.classList.add(
      'hidden'
    );
    adminSchoolsPanel?.classList.remove(
      'hidden'
    );

    resetAdminSchoolFilters();

    const title = document.getElementById(
      'adminSchoolsTitle'
    );
    const subtitle = document.getElementById(
      'adminSchoolsSubtitle'
    );
    const selectionSummary =
      document.getElementById(
        'adminSelectedSupervisorSummary'
      );
    const supervisorSelect =
      document.getElementById(
        'adminSchoolSupervisorFilter'
      );

    const supervisor = supervisorId
      ? adminSupervisors.find(
          item =>
            item.supervisorId === supervisorId
        )
      : null;

    if (supervisor) {
      if (title) {
        title.textContent =
          `مدارس المشرف: ${
            supervisor.supervisorName
          }`;
      }
      if (subtitle) {
        subtitle.textContent =
          'عرض المدارس المحملة دون طلب جديد';
      }
      if (supervisorSelect) {
        supervisorSelect.value = supervisorId;
        supervisorSelect.disabled = true;
      }
      if (selectionSummary) {
        selectionSummary.innerHTML = `
          <span>عدد المدارس: <b>${
            supervisor.totalSchools
          }</b></span>
          <span>نسبة الإنجاز: <b>${
            supervisor.averageAchievement
          }%</b></span>
          <span>مكتملة: <b>${
            supervisor.completedSchools
          }</b></span>
          <span>تحتاج متابعة: <b>${
            supervisor.pendingSchools
          }</b></span>
        `;
        selectionSummary.classList.remove(
          'hidden'
        );
      }
    } else {
      if (title) {
        title.textContent = 'جميع المدارس';
      }
      if (subtitle) {
        subtitle.textContent =
          'متابعة جميع مدارس النظام';
      }
      if (supervisorSelect) {
        supervisorSelect.disabled = false;
      }
      selectionSummary?.classList.add('hidden');
    }

    renderAdminSchools();
  }


  function renderAdminDashboard(data) {
    adminSchools = Array.isArray(data.schools)
      ? data.schools
      : [];
    adminSupervisors = Array.isArray(
      data.supervisors
    ) ? data.supervisors : [];
    adminSummary = data.summary || {};

    populateAdminSchoolFilters();
    renderAdminStats();
    renderAdminSupervisors();
    showAdminSupervisors();

    adminLoading?.classList.add('hidden');
    adminError?.classList.add('hidden');
    adminDashboardBody?.classList.remove(
      'hidden'
    );
  }


  async function loadAdminDashboard(session) {

    const nationalId =
      getSupervisorNationalId(session);

    if (!nationalId) {
      throw new Error(
        'ADMIN_NATIONAL_ID_MISSING'
      );
    }

    setAdminLoading();

    const result =
      await SafetyAPI.getAdminDashboard(
        nationalId
      );

    if (!result || result.success !== true) {
      throw new Error(
        result?.message ||
        'تعذر تحميل بيانات لوحة مدير النظام.'
      );
    }

    renderAdminDashboard(result.data || {});
  }


  function loadDashboardForSession(session) {

    if (session?.role === 'مدير') {
      return loadAdminDashboard(session);
    }

    if (session?.role === 'مشرف') {
      return loadSupervisorSchools(session);
    }

    return Promise.reject(
      new Error('UNAUTHORIZED_ROLE')
    );
  }


  let adminSearchTimer = null;

  document.getElementById(
    'adminSupervisorSearch'
  )?.addEventListener('input', () => {
    clearTimeout(adminSearchTimer);
    adminSearchTimer = setTimeout(
      renderAdminSupervisors,
      120
    );
  });

  [
    'adminSupervisorStatusFilter',
    'adminSupervisorSort'
  ].forEach(id => {
    document.getElementById(id)
      ?.addEventListener(
        'change',
        renderAdminSupervisors
      );
  });


  document
    .querySelectorAll('.admin-school-filter')
    .forEach(button => {
      button.addEventListener('click', () => {
        document
          .querySelectorAll(
            '.admin-school-filter'
          )
          .forEach(item =>
            item.classList.toggle(
              'active',
              item === button
            )
          );
        renderAdminSchools();
      });
    });


  [
    'adminSchoolSupervisorFilter',
    'adminGovernorateFilter',
    'adminEvacuationPlanFilter',
    'adminReportStatusFilter'
  ].forEach(id => {
    document.getElementById(id)
      ?.addEventListener(
        'change',
        renderAdminSchools
      );
  });


  document.getElementById(
    'adminReportTypeFilter'
  )?.addEventListener('change', event => {
    document.getElementById(
      'adminEvacuationPlanFilterField'
    )?.classList.toggle(
      'hidden',
      event.target.value !== 'evacuation'
    );
    renderAdminSchools();
  });


  document.getElementById(
    'adminResetSchoolFiltersButton'
  )?.addEventListener('click', () => {
    resetAdminSchoolFilters();
    if (selectedAdminSupervisorId) {
      const field = document.getElementById(
        'adminSchoolSupervisorFilter'
      );
      if (field) {
        field.value =
          selectedAdminSupervisorId;
      }
    }
    renderAdminSchools();
  });


  document.getElementById(
    'adminAllSchoolsButton'
  )?.addEventListener(
    'click',
    () => showAdminSchools()
  );


  document.getElementById(
    'adminBackToSupervisorsButton'
  )?.addEventListener(
    'click',
    showAdminSupervisors
  );


  document.getElementById(
    'adminRetryButton'
  )?.addEventListener('click', async () => {
    if (!currentDashboardSession) {
      return;
    }
    try {
      await loadAdminDashboard(
        currentDashboardSession
      );
    } catch (error) {
      setAdminError(error);
    }
  });

  /*
   * =====================================================
   * تحميل مدارس المشرف
   * =====================================================
   */

  async function loadSupervisorSchools(
    session
  ) {

    const nationalId =
      getSupervisorNationalId(
        session
      );


    if (!nationalId) {

      console.error(
        'السجل المدني للمشرف غير موجود في الجلسة.'
      );

      throw new Error(
        'SUPERVISOR_NATIONAL_ID_MISSING'
      );
    }


    setDashboardLoading();


    /*
     * نستدعي الـ API الذي اختبرناه سابقًا.
     *
     * يجب أن تكون هذه الدالة موجودة في api.js.
     */

    const result =
      await SafetyAPI.getSupervisorSchools(
        nationalId
      );


    if (
      !result ||
      result.success !== true
    ) {

      throw new Error(
        result?.message ||
        'تعذر تحميل مدارس المشرف.'
      );
    }


    const data =
      result.data || {};


    const schools =
  Array.isArray(data.schools)
    ? data.schools
    : [];


/*
 * حفظ المدارس في الذاكرة
 */
supervisorSchools =
  schools;


/*
 * العودة تلقائيًا إلى عرض جميع المدارس
 */
currentSchoolsFilter =
  'all';

currentReportTypeFilter =
  'all';

currentEvacuationPlanFilter =
  'all';

currentEvacuationStatusFilter =
  'all';

if (reportTypeFilter) {
  reportTypeFilter.value = 'all';
}

if (evacuationPlanFilter) {
  evacuationPlanFilter.value = 'all';
}

if (evacuationStatusFilter) {
  evacuationStatusFilter.value = 'all';
}

syncReportFilterVisibility();


document
  .querySelectorAll(
    '.school-filter'
  )
  .forEach(button => {

    button.classList.toggle(
      'active',
      button.dataset.filter === 'all'
    );
  });


/*
 * تحديث المؤشرات
 */
renderDashboardStats(
  schools,
  data.totalSchools
);


/*
 * تحديث أعداد التصنيفات
 */
updateSchoolFilterCounts();


/*
 * عرض المدارس
 */
renderSchools();


    /*
     * سنستخدم المدارس نفسها في الخطوة التالية
     * لإنشاء بطاقات/جدول المدارس.
     */

    return schools;
  }


  /*
   * =====================================================
   * إظهار لوحة التحكم
   * =====================================================
   */

  async function showDashboard(
    session
  ) {

    if (!session) {
      return;
    }


    loginView.classList.add('hidden');
    dashboardView.classList.remove('hidden');

    currentDashboardSession = session;

    const isAdmin =
      session.role === 'مدير';

    supervisorDashboardContent?.classList.toggle(
      'hidden',
      isAdmin
    );
    adminDashboardContent?.classList.toggle(
      'hidden',
      !isAdmin
    );


    if (userName) {
      userName.textContent =
        session.name ||
        'المستخدم';
    }


    if (userRole) {
      userRole.textContent =
        session.role ||
        '';
    }


    try {

      await loadDashboardForSession(
        session
      );

    } catch (error) {

      console.error(
        'Dashboard Load Error:',
        error
      );


      /*
       * في حالة فشل الاتصال
       */

      if (isAdmin) {
        setAdminError(error);
      } else {
        if (schoolsCount) {
          schoolsCount.textContent = '—';
        }

        if (averageProgress) {
          averageProgress.textContent = '—';
        }

        if (completedSchools) {
          completedSchools.textContent = '—';
        }

        if (pendingSchools) {
          pendingSchools.textContent = '—';
        }
      }
    }
  }


  /*
   * =====================================================
   * تنظيف السجل أثناء الكتابة
   * =====================================================
   */

  nationalIdInput.addEventListener(
    'input',
    () => {

      nationalIdInput.value =
        SafetyAuth.normalizeNationalId(
          nationalIdInput.value
        ).slice(0, 10);

      showMessage('');
    }
  );


  /*
   * =====================================================
   * تسجيل الدخول
   * =====================================================
   */

  loginForm.addEventListener(
    'submit',
    async event => {

      event.preventDefault();

      showMessage('');


      const nationalId =
        SafetyAuth.normalizeNationalId(
          nationalIdInput.value
        );


      if (
        !SafetyAuth.isValidNationalId(
          nationalId
        )
      ) {

        showMessage(
          'يرجى إدخال سجل مدني صحيح مكون من 10 أرقام.'
        );

        nationalIdInput.focus();

        return;
      }


      setLoginLoading(true);


      try {

        const result =
          await SafetyAuth.login(
            nationalId
          );


        if (
          !result ||
          result.success !== true
        ) {

          showMessage(
            result?.message ||
            'تعذر تسجيل الدخول.'
          );

          return;
        }


        nationalIdInput.value = '';


        await showDashboard(
          result.data
        );


      } catch (error) {

        console.error(
          'Login Error:',
          error
        );


        showMessage(
          'حدث خطأ غير متوقع أثناء تسجيل الدخول.'
        );


      } finally {

        setLoginLoading(false);
      }
    }
  );


  /*
   * =====================================================
   * تسجيل الخروج
   * =====================================================
   */

  if (logoutButton) {

    logoutButton.addEventListener(
      'click',
      () => {

        SafetyAuth.logout();

        supervisorSchools = [];
        currentDashboardSession = null;
        clearAdminState();

        const supervisorSchoolsList =
          document.getElementById(
            'schoolsList'
          );

        if (supervisorSchoolsList) {
          schoolListRenderTokens.set(
            supervisorSchoolsList,
            {}
          );
          supervisorSchoolsList.innerHTML = '';
        }

        nationalIdInput.value = '';

        showLoginView();

        nationalIdInput.focus();
      }
    );
  }


  /*
   * =====================================================
   * استعادة الجلسة
   * =====================================================
   */

  const existingSession =
    SafetyAuth.getSession();


  if (existingSession) {

    showDashboard(
      existingSession
    );

  } else {

    showLoginView();
  }

});
