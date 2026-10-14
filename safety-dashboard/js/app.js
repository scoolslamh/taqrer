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
let adminSystemStatus = {
  status: 'OPEN',
  isOpen: true,
  message: '',
  updatedAt: '',
  updatedBy: ''
};
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

  const percentage = stats.total > 0
    ? Math.round(
        (stats.completed / stats.total) * 100
      )
    : 0;

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

  const percentageElement =
    document.getElementById(
      'reportSummaryPercentage'
    );

  const progressBar =
    document.getElementById(
      'reportSummaryProgressBar'
    );

  const progressTrack =
    document.getElementById(
      'reportSummaryProgressTrack'
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

  if (percentageElement) {
    percentageElement.textContent =
      `${percentage}%`;
  }

  if (progressBar) {
    progressBar.style.width =
      `${percentage}%`;
  }

  if (progressTrack) {
    progressTrack.setAttribute(
      'aria-valuenow',
      String(percentage)
    );
    progressTrack.setAttribute(
      'aria-valuetext',
      `${percentage}%، ${stats.completed} من ${stats.total}`
    );
  }
}


function getSelectedReportLabel(
  reportType,
  evacuationPlan
) {
  if (reportType === 'all') {
    return 'جميع التقارير';
  }

  if (reportType === 'evacuation') {
    return evacuationPlan === 'all'
      ? 'خطط الإخلاء الأربع'
      : EVACUATION_PLAN_LABELS[
          evacuationPlan
        ] || 'خطة الإخلاء';
  }

  return REPORT_TYPE_LABELS[reportType] ||
    'التقرير المختار';
}


function formatExportProgress(report) {
  const completed = Number(report?.completed) || 0;
  const target = Number(report?.target) || 0;

  return `${completed} من ${target}`;
}


function buildSchoolExportRows(
  schools,
  options
) {
  return schools.map((school, index) => {
    const achievement = school.achievement || {};
    const plans = getEvacuationPlans(school);
    const selectedCompleted =
      isSelectedReportCompleted(
        school,
        {
          reportType: options.reportType,
          evacuationPlan:
            options.evacuationPlan
        }
      );

    return {
      sequence: index + 1,
      schoolName: school.schoolName || '',
      statisticalNumbers: Array.isArray(
        school.statisticalNumbers
      )
        ? school.statisticalNumbers.join('، ')
        : school.statisticalNumbers || '',
      schoolEmail: school.schoolEmail || '',
      schoolGender: school.schoolGender || '',
      governorate: school.governorate || '',
      city: school.city || '',
      staffType: school.staffType || '',
      schoolStatus: school.schoolStatus || '',
      principalName: school.principalName || '',
      principalPhone: school.principalPhone || '',
      coordinatorName:
        school.coordinatorName || '',
      coordinatorPhone:
        school.coordinatorPhone || '',
      supervisorName:
        school.supervisorName ||
        options.supervisorName || '',
      achievementPercentage:
        `${getSchoolPercentage(school)}%`,
      evacuationProgress:
        formatExportProgress(
          achievement.evacuation
        ),
      evacuationPlan1:
        plans[1] === true ? 'تم الرفع' : 'لم يتم الرفع',
      evacuationPlan2:
        plans[2] === true ? 'تم الرفع' : 'لم يتم الرفع',
      evacuationPlan3:
        plans[3] === true ? 'تم الرفع' : 'لم يتم الرفع',
      evacuationPlan4:
        plans[4] === true ? 'تم الرفع' : 'لم يتم الرفع',
      safetyMomentProgress:
        formatExportProgress(
          achievement.safetyMoment
        ),
      civilDefenseProgress:
        formatExportProgress(
          achievement.civilDefense
        ),
      trafficWeekProgress:
        formatExportProgress(
          achievement.trafficWeek
        ),
      selectedReportStatus:
        selectedCompleted
          ? 'منجز'
          : 'غير منجز'
    };
  });
}


const SCHOOL_EXPORT_COLUMNS = [
  { key: 'sequence', header: 'م', width: 7 },
  { key: 'schoolName', header: 'اسم المدرسة', width: 30 },
  { key: 'statisticalNumbers', header: 'الأرقام الإحصائية', width: 22 },
  { key: 'schoolEmail', header: 'البريد الإلكتروني للمدرسة', width: 32 },
  { key: 'schoolGender', header: 'الجنس', width: 12 },
  { key: 'governorate', header: 'المحافظة', width: 18 },
  { key: 'city', header: 'المدينة', width: 18 },
  { key: 'staffType', header: 'الكادر', width: 15 },
  { key: 'schoolStatus', header: 'حالة المدرسة', width: 16 },
  { key: 'principalName', header: 'اسم مدير المدرسة', width: 26 },
  { key: 'principalPhone', header: 'جوال مدير المدرسة', width: 19 },
  { key: 'coordinatorName', header: 'اسم منسق الأمن والسلامة', width: 28 },
  { key: 'coordinatorPhone', header: 'جوال منسق الأمن والسلامة', width: 22 },
  { key: 'supervisorName', header: 'اسم المشرف', width: 24 },
  { key: 'achievementPercentage', header: 'الإنجاز العام', width: 16 },
  { key: 'evacuationProgress', header: 'خطط الإخلاء', width: 17 },
  { key: 'evacuationPlan1', header: 'الخطة الأولى', width: 16 },
  { key: 'evacuationPlan2', header: 'الخطة الثانية', width: 16 },
  { key: 'evacuationPlan3', header: 'الخطة الثالثة', width: 16 },
  { key: 'evacuationPlan4', header: 'الخطة الرابعة', width: 16 },
  { key: 'safetyMomentProgress', header: 'لحظة سلامة', width: 17 },
  { key: 'civilDefenseProgress', header: 'الدفاع المدني', width: 18 },
  { key: 'trafficWeekProgress', header: 'أسبوع المرور', width: 17 },
  { key: 'selectedReportStatus', header: 'حالة الاختيار الحالي', width: 20 }
];


function downloadFilteredSchoolsExcel(
  schools,
  options
) {
  if (!Array.isArray(schools) || schools.length === 0) {
    window.alert(
      'لا توجد مدارس مطابقة للفلاتر الحالية لتصديرها.'
    );
    return;
  }

  if (!window.SchoolExcelExport) {
    window.alert(
      'تعذر تجهيز ملف Excel. يرجى تحديث الصفحة والمحاولة مرة أخرى.'
    );
    return;
  }

  const reportLabel = getSelectedReportLabel(
    options.reportType,
    options.evacuationPlan
  );
  const exportDate = new Intl.DateTimeFormat(
    'ar-SA-u-ca-gregory',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Riyadh'
    }
  ).format(new Date());

  window.SchoolExcelExport.downloadWorkbook({
    title: `تقرير المدارس - ${reportLabel}`,
    subtitle:
      `حسب الفلاتر الحالية | عدد المدارس: ${schools.length} | تاريخ التصدير: ${exportDate}`,
    sheetName: 'المدارس',
    columns: SCHOOL_EXPORT_COLUMNS,
    rows: buildSchoolExportRows(
      schools,
      options
    ),
    fileName:
      `تقرير_المدارس_${reportLabel}_${
        new Date().toISOString().slice(0, 10)
      }`
  });
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

  const primarySchoolNumber =
    statisticalNumbers[0] ||
    school?.achievement?.schoolNumber || '';


  const locationParts =
    [governorate, city]
      .filter(Boolean);


  const location =
    locationParts.join(' - ');

  const schoolGender = String(
    school?.schoolGender || ''
  ).trim();

  const schoolGenderClass =
    schoolGender === 'بنين'
      ? 'boys'
      : schoolGender === 'بنات'
        ? 'girls'
        : 'unknown';

  const contacts = [
    {
      role: 'مدير المدرسة',
      name: String(
        school?.principalName || ''
      ).trim(),
      phone: String(
        school?.principalPhone || ''
      ).trim()
    },
    {
      role: 'منسق الأمن والسلامة',
      name: String(
        school?.coordinatorName || ''
      ).trim(),
      phone: String(
        school?.coordinatorPhone || ''
      ).trim()
    }
  ].filter(contact => contact.name || contact.phone);


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

          <div class="school-meta">
            ${
              location
                ? `<span>${escapeHTML(location)}</span>`
                : ''
            }
            <span class="school-gender-badge ${schoolGenderClass}">
              ${escapeHTML(
                schoolGender || 'غير محدد'
              )}
            </span>
          </div>

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

      ${
        primarySchoolNumber
          ? `
            <div class="school-report-viewer-action">
              <button
                class="school-reports-view-button"
                type="button"
                data-school-number="${escapeHTML(primarySchoolNumber)}"
                data-school-name="${escapeHTML(schoolName)}"
              >استعراض التقارير المرفوعة</button>
            </div>
          `
          : ''
      }

      ${
        contacts.length
          ? `
            <div class="school-contacts" aria-label="بيانات التواصل">
              ${contacts.map(contact => `
                <div class="school-contact-row">
                  <span class="school-contact-role">${escapeHTML(
                    contact.role
                  )}:</span>
                  <span class="school-contact-name">${escapeHTML(
                    contact.name || 'غير مسجل'
                  )}</span>
                  ${
                    contact.phone
                      ? `
                        <button
                          class="school-contact-phone"
                          type="button"
                          data-phone="${escapeHTML(contact.phone)}"
                          data-contact-name="${escapeHTML(
                            contact.name || contact.role
                          )}"
                          aria-haspopup="menu"
                          aria-expanded="false"
                          title="خيارات التواصل مع ${escapeHTML(
                            contact.name || contact.role
                          )}"
                        >${escapeHTML(contact.phone)}</button>
                      `
                      : '<span class="school-contact-missing">لا يوجد رقم</span>'
                  }
                </div>
              `).join('')}
            </div>
          `
          : ''
      }

    </article>
  `;
}


function normalizeContactPhone(value) {
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  const persianDigits = '۰۱۲۳۴۵۶۷۸۹';

  return String(value || '')
    .replace(/[٠-٩]/g, digit =>
      String(arabicDigits.indexOf(digit))
    )
    .replace(/[۰-۹]/g, digit =>
      String(persianDigits.indexOf(digit))
    )
    .replace(/\D/g, '');
}


function getWhatsAppPhone(value) {
  let phone = normalizeContactPhone(value);

  if (phone.startsWith('00')) {
    phone = phone.slice(2);
  }
  if (phone.startsWith('0')) {
    phone = `966${phone.slice(1)}`;
  } else if (
    phone.length === 9 &&
    phone.startsWith('5')
  ) {
    phone = `966${phone}`;
  }

  return phone;
}


function copyTextToClipboard(value) {
  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    return navigator.clipboard.writeText(value);
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();

  try {
    document.execCommand('copy');
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    input.remove();
  }
}


let activePhoneButton = null;


function closeSchoolPhoneMenu() {
  document.getElementById(
    'schoolPhoneActionsMenu'
  )?.remove();

  if (activePhoneButton) {
    activePhoneButton.setAttribute(
      'aria-expanded',
      'false'
    );
    activePhoneButton = null;
  }
}


function openSchoolPhoneMenu(button) {
  if (activePhoneButton === button) {
    closeSchoolPhoneMenu();
    return;
  }

  closeSchoolPhoneMenu();

  const rawPhone = button.dataset.phone || '';
  const phone = normalizeContactPhone(rawPhone);
  const whatsappPhone = getWhatsAppPhone(rawPhone);

  if (!phone) {
    return;
  }

  const menu = document.createElement('div');
  menu.id = 'schoolPhoneActionsMenu';
  menu.className = 'school-phone-actions-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `
    <button type="button" data-phone-action="copy" role="menuitem">نسخ</button>
    <a href="https://wa.me/${whatsappPhone}" target="_blank" rel="noopener noreferrer" role="menuitem">واتساب</a>
    <a href="tel:${phone}" role="menuitem">اتصال</a>
  `;

  document.body.appendChild(menu);

  const rect = button.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const horizontalMargin = 8;
  let left = rect.right - menuRect.width;
  left = Math.max(
    horizontalMargin,
    Math.min(
      left,
      window.innerWidth - menuRect.width -
      horizontalMargin
    )
  );
  let top = rect.bottom + 6;

  if (
    top + menuRect.height >
    window.innerHeight - horizontalMargin
  ) {
    top = rect.top - menuRect.height - 6;
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(horizontalMargin, top)}px`;
  menu.dataset.phone = rawPhone;

  activePhoneButton = button;
  button.setAttribute('aria-expanded', 'true');
}


document.addEventListener('click', event => {
  const phoneButton = event.target.closest(
    '.school-contact-phone'
  );

  if (phoneButton) {
    event.preventDefault();
    event.stopPropagation();
    openSchoolPhoneMenu(phoneButton);
    return;
  }

  const menu = event.target.closest(
    '#schoolPhoneActionsMenu'
  );

  if (menu) {
    const copyButton = event.target.closest(
      '[data-phone-action="copy"]'
    );

    if (copyButton) {
      event.preventDefault();
      copyTextToClipboard(
        menu.dataset.phone || ''
      ).then(() => {
        copyButton.textContent = 'تم النسخ';
        setTimeout(closeSchoolPhoneMenu, 700);
      }).catch(() => {
        copyButton.textContent = 'تعذر النسخ';
      });
      return;
    }

    closeSchoolPhoneMenu();
    return;
  }

  closeSchoolPhoneMenu();
});


document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeSchoolPhoneMenu();
  }
});


window.addEventListener(
  'scroll',
  closeSchoolPhoneMenu,
  true
);


let reviewerReports = [];
let reviewerReportsTrigger = null;


function ensureReportsViewerModal() {
  let modal = document.getElementById(
    'schoolReportsViewerModal'
  );

  if (modal) {
    return modal;
  }

  modal = document.createElement('div');
  modal.id = 'schoolReportsViewerModal';
  modal.className = 'reports-viewer-modal hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute(
    'aria-labelledby',
    'reportsViewerTitle'
  );
  modal.innerHTML = `
    <div class="reports-viewer-backdrop" data-close-reports-viewer></div>
    <section class="reports-viewer-dialog">
      <header class="reports-viewer-header">
        <div>
          <span>تقارير المدرسة</span>
          <h2 id="reportsViewerTitle">استعراض التقارير المرفوعة</h2>
          <p id="reportsViewerSchoolName"></p>
        </div>
        <button class="reports-viewer-close" type="button" data-close-reports-viewer aria-label="إغلاق">×</button>
      </header>
      <div class="reports-viewer-toolbar">
        <label for="reportsViewerFilter">نوع التقرير</label>
        <select id="reportsViewerFilter">
          <option value="all">جميع التقارير</option>
          <option value="evacuation">خطط الإخلاء</option>
          <option value="safetyMoment">لحظة سلامة</option>
          <option value="civilDefense">الدفاع المدني</option>
          <option value="trafficWeek">أسبوع المرور</option>
        </select>
      </div>
      <div id="reportsViewerState" class="reports-viewer-state">جاري تحميل التقارير...</div>
      <div id="reportsViewerList" class="reports-viewer-list hidden"></div>
    </section>
  `;
  document.body.appendChild(modal);

  modal.querySelectorAll(
    '[data-close-reports-viewer]'
  ).forEach(element => {
    element.addEventListener(
      'click',
      closeReportsViewer
    );
  });

  modal.querySelector(
    '#reportsViewerFilter'
  )?.addEventListener(
    'change',
    renderReviewerReports
  );

  return modal;
}


function closeReportsViewer() {
  const modal = document.getElementById(
    'schoolReportsViewerModal'
  );
  modal?.classList.add('hidden');
  document.body.classList.remove(
    'reports-viewer-open'
  );
  reviewerReports = [];
  reviewerReportsTrigger?.focus();
  reviewerReportsTrigger = null;
}


function getReportFileLinks(report) {
  const fileId = String(
    report?.fileId || ''
  ).trim();

  if (!/^[A-Za-z0-9_-]+$/.test(fileId)) {
    return null;
  }

  return {
    view:
      `https://drive.google.com/file/d/${fileId}/view`,
    download:
      `https://drive.google.com/uc?export=download&id=${fileId}`
  };
}


function renderReviewerReports() {
  const modal = ensureReportsViewerModal();
  const filter = modal.querySelector(
    '#reportsViewerFilter'
  )?.value || 'all';
  const list = modal.querySelector(
    '#reportsViewerList'
  );
  const state = modal.querySelector(
    '#reportsViewerState'
  );
  const reports = reviewerReports.filter(
    report =>
      filter === 'all' ||
      report.source === filter
  );

  if (!list || !state) {
    return;
  }

  if (reports.length === 0) {
    list.classList.add('hidden');
    state.classList.remove('hidden');
    state.textContent =
      'لا توجد تقارير مطابقة لهذا النوع.';
    return;
  }

  state.classList.add('hidden');
  list.classList.remove('hidden');
  list.innerHTML = reports.map((report, index) => {
    const links = getReportFileLinks(report);
    const typeLabel =
      report.source === 'evacuation'
        ? report.evacuationPlan
          ? `خطة الإخلاء رقم ${report.evacuationPlan}`
          : 'خطة إخلاء'
        : REPORT_TYPE_LABELS[report.source] ||
          report.reportType || 'تقرير';

    return `
      <article class="reviewer-report-item">
        <div class="reviewer-report-number">${index + 1}</div>
        <div class="reviewer-report-info">
          <span>${escapeHTML(typeLabel)}</span>
          <strong>${escapeHTML(
            report.title || typeLabel
          )}</strong>
          <small>
            تاريخ التنفيذ: ${escapeHTML(
              report.executionDate || 'غير محدد'
            )} · تاريخ الرفع: ${escapeHTML(
              report.uploadDate || 'غير محدد'
            )}
          </small>
          ${
            report.fileName
              ? `<small class="reviewer-report-file">${escapeHTML(report.fileName)}</small>`
              : ''
          }
        </div>
        <span class="reviewer-report-status">${escapeHTML(
          report.status || 'مرفوع'
        )}</span>
        <div class="reviewer-report-actions">
          ${
            links
              ? `
                <a href="${links.view}" target="_blank" rel="noopener noreferrer">عرض</a>
                <a href="${links.download}" target="_blank" rel="noopener noreferrer">تحميل</a>
              `
              : '<span>الملف غير متاح</span>'
          }
        </div>
      </article>
    `;
  }).join('');
}


async function openReportsViewer(button) {
  const modal = ensureReportsViewerModal();
  const state = modal.querySelector(
    '#reportsViewerState'
  );
  const list = modal.querySelector(
    '#reportsViewerList'
  );
  const filter = modal.querySelector(
    '#reportsViewerFilter'
  );

  reviewerReportsTrigger = button;
  reviewerReports = [];
  modal.classList.remove('hidden');
  document.body.classList.add(
    'reports-viewer-open'
  );

  if (filter) {
    filter.value = 'all';
  }
  if (list) {
    list.innerHTML = '';
    list.classList.add('hidden');
  }
  if (state) {
    state.textContent = 'جاري تحميل التقارير...';
    state.classList.remove('hidden');
  }

  const schoolName = modal.querySelector(
    '#reportsViewerSchoolName'
  );
  if (schoolName) {
    schoolName.textContent =
      button.dataset.schoolName || '';
  }

  const result =
    await SafetyAPI.getReviewerSchoolReports(
      getSupervisorNationalId(
        currentDashboardSession
      ),
      button.dataset.schoolNumber
    );

  if (!result || result.success !== true) {
    if (state) {
      state.textContent =
        result?.message ||
        'تعذر تحميل تقارير المدرسة.';
    }
    return;
  }

  reviewerReports = Array.isArray(
    result.data?.reports
  ) ? result.data.reports : [];

  if (schoolName) {
    schoolName.textContent =
      result.data?.schoolName ||
      button.dataset.schoolName || '';
  }

  renderReviewerReports();
}


document.addEventListener('click', event => {
  const button = event.target.closest(
    '.school-reports-view-button'
  );

  if (button) {
    openReportsViewer(button);
  }
});


document.addEventListener('keydown', event => {
  if (
    event.key === 'Escape' &&
    !document.getElementById(
      'schoolReportsViewerModal'
    )?.classList.contains('hidden')
  ) {
    closeReportsViewer();
  }
});


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


document.getElementById(
  'exportSchoolsExcelButton'
)?.addEventListener('click', () => {
  downloadFilteredSchoolsExcel(
    getFilteredSchools(),
    {
      reportType: currentReportTypeFilter,
      evacuationPlan:
        currentEvacuationPlanFilter,
      supervisorName:
        currentDashboardSession?.name || ''
    }
  );
});


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
    adminSystemStatus = {
      status: 'OPEN',
      isOpen: true,
      message: '',
      updatedAt: '',
      updatedBy: ''
    };
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

    [
      'adminSupervisorReportTypeFilter',
      'adminSupervisorEvacuationPlanFilter',
      'adminSupervisorStatusFilter'
    ].forEach(id => {
      const field = document.getElementById(id);
      if (field) {
        field.value = 'all';
      }
    });
    document.getElementById(
      'adminSupervisorEvacuationPlanFilterField'
    )?.classList.add('hidden');
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


  function renderAdminSystemStatus() {
    const isOpen =
      adminSystemStatus.isOpen !== false &&
      adminSystemStatus.status !== 'CLOSED';
    const card = document.getElementById(
      'adminSystemControl'
    );
    const badge = document.getElementById(
      'adminSystemStatusBadge'
    );
    const description = document.getElementById(
      'adminSystemStatusDescription'
    );
    const messageField = document.getElementById(
      'adminSystemClosedMessage'
    );
    const meta = document.getElementById(
      'adminSystemStatusMeta'
    );
    const button = document.getElementById(
      'adminSystemToggleButton'
    );

    card?.classList.toggle('closed', !isOpen);
    badge?.classList.toggle('open', isOpen);
    badge?.classList.toggle('closed', !isOpen);

    if (badge) {
      badge.textContent = isOpen ? 'مفتوح' : 'مغلق';
    }
    if (description) {
      description.textContent = isOpen
        ? 'النظام متاح للمدارس وعمليات رفع التقارير.'
        : 'دخول المدارس وعمليات الرفع والتعديل متوقفة، بينما تبقى لوحات المتابعة متاحة.';
    }
    if (messageField) {
      messageField.value =
        adminSystemStatus.message || '';
    }
    if (button) {
      button.textContent = isOpen
        ? 'إغلاق النظام'
        : 'فتح النظام';
      button.classList.toggle(
        'close-system',
        isOpen
      );
      button.classList.toggle(
        'open-system',
        !isOpen
      );
      button.dataset.nextStatus = isOpen
        ? 'CLOSED'
        : 'OPEN';
    }

    if (meta) {
      const updatedAt =
        adminSystemStatus.updatedAt
          ? new Date(
              adminSystemStatus.updatedAt
            ).toLocaleString('ar-SA')
          : '';
      const details = [
        adminSystemStatus.updatedBy
          ? `آخر تعديل بواسطة: ${adminSystemStatus.updatedBy}`
          : '',
        updatedAt
          ? `بتاريخ: ${updatedAt}`
          : ''
      ].filter(Boolean);
      meta.textContent = details.join(' — ');
    }
  }


  function showAdminSystemFeedback(
    message,
    isError = false
  ) {
    const feedback = document.getElementById(
      'adminSystemStatusFeedback'
    );
    if (!feedback) {
      return;
    }
    feedback.textContent = message;
    feedback.classList.toggle('error', isError);
    feedback.classList.toggle('hidden', !message);
  }


  function getAdminSupervisorReportFilters() {
    return {
      reportType:
        document.getElementById(
          'adminSupervisorReportTypeFilter'
        )?.value || 'all',
      evacuationPlan:
        document.getElementById(
          'adminSupervisorEvacuationPlanFilter'
        )?.value || 'all'
    };
  }


  function getAdminSupervisorReportTitle(filters) {
    if (filters.reportType === 'all') {
      return 'الإنجاز العام لجميع التقارير';
    }

    if (filters.reportType === 'evacuation') {
      return filters.evacuationPlan === 'all'
        ? 'جميع خطط الإخلاء'
        : EVACUATION_PLAN_LABELS[
            Number(filters.evacuationPlan)
          ] || 'خطة الإخلاء';
    }

    return REPORT_TYPE_LABELS[
      filters.reportType
    ] || 'التقرير المختار';
  }


  function getAdminSupervisorMetric(
    supervisor,
    filters = getAdminSupervisorReportFilters()
  ) {
    if (filters.reportType === 'all') {
      const total =
        Number(supervisor.totalSchools) || 0;
      const completed =
        Number(supervisor.completedSchools) || 0;

      return {
        total,
        completed,
        pending: Math.max(0, total - completed),
        percentage: Math.max(
          0,
          Math.min(
            100,
            Number(
              supervisor.averageAchievement
            ) || 0
          )
        ),
        isCompleted:
          supervisor.achievementStatus ===
          'مكتمل'
      };
    }

    const schools = adminSchools.filter(
      school =>
        school.supervisorId ===
        supervisor.supervisorId
    );
    const completed = schools.filter(
      school =>
        isSelectedReportCompleted(
          school,
          filters
        )
    ).length;
    const total = schools.length;

    return {
      total,
      completed,
      pending: Math.max(0, total - completed),
      percentage: total
        ? Math.round((completed / total) * 100)
        : 0,
      isCompleted: total > 0 && completed === total
    };
  }


  function syncAdminSupervisorReportFilter() {
    const filters =
      getAdminSupervisorReportFilters();
    const title =
      getAdminSupervisorReportTitle(filters);

    document.getElementById(
      'adminSupervisorEvacuationPlanFilterField'
    )?.classList.toggle(
      'hidden',
      filters.reportType !== 'evacuation'
    );
    setText(
      'adminSupervisorsSubtitle',
      `النسب محسوبة حسب: ${title}`
    );
    setText(
      'adminSupervisorPercentageHeader',
      `نسبة الإنجاز (${title})`
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

    const reportFilters =
      getAdminSupervisorReportFilters();

    const result = adminSupervisors.map(
      supervisor => ({
        supervisor,
        metric: getAdminSupervisorMetric(
          supervisor,
          reportFilters
        )
      })
    ).filter(
      ({ supervisor, metric }) => {
        const matchesSearch =
          !search ||
          String(
            supervisor.supervisorName || ''
          ).toLocaleLowerCase('ar')
            .includes(search);

        const matchesStatus =
          status === 'all' ||
          (
            status === 'completed'
              ? metric.isCompleted
              : !metric.isCompleted
          );

        return matchesSearch && matchesStatus;
      }
    );

    result.sort((a, b) => {
      if (sort === 'name') {
        return String(
          a.supervisor.supervisorName || ''
        ).localeCompare(
          String(
            b.supervisor.supervisorName || ''
          ),
          'ar'
        );
      }

      const difference =
        a.metric.percentage -
        b.metric.percentage;

      const achievementOrder =
        sort === 'achievement-desc'
          ? -difference
          : difference;

      return achievementOrder ||
        String(
          a.supervisor.supervisorName || ''
        )
          .localeCompare(
            String(
              b.supervisor.supervisorName || ''
            ),
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

    syncAdminSupervisorReportFilter();

    const supervisors =
      getFilteredAdminSupervisors();

    body.innerHTML = '';
    empty?.classList.toggle(
      'hidden',
      supervisors.length > 0
    );

    supervisors.forEach(item => {
      const { supervisor, metric } = item;
      const percentage = metric.percentage;

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
          ${metric.total}
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
          ${metric.completed}
        </td>
        <td data-label="تحتاج متابعة">
          ${metric.pending}
        </td>
        <td data-label="الحالة">
          <span class="school-status ${
            metric.isCompleted
              ? 'completed'
              : 'pending'
          }">
            ${escapeHTML(
              metric.isCompleted
                ? 'مكتمل'
                : 'يحتاج متابعة'
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
          supervisor.supervisorId,
          getAdminSupervisorReportFilters()
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


  function getAdminSchoolFilterState() {

    return {
      schoolStatus:
        document.querySelector(
          '.admin-school-filter.active'
        )?.dataset.filter || 'all',
      supervisorFilter:
        document.getElementById(
          'adminSchoolSupervisorFilter'
        )?.value || 'all',
      governorateFilter:
        document.getElementById(
          'adminGovernorateFilter'
        )?.value || 'all',
      reportType:
        document.getElementById(
          'adminReportTypeFilter'
        )?.value || 'all',
      evacuationPlan:
        document.getElementById(
          'adminEvacuationPlanFilter'
        )?.value || 'all',
      reportStatus:
        document.getElementById(
          'adminReportStatusFilter'
        )?.value || 'all'
    };
  }


  function getAdminReportScopeSchools(filters) {

    const {
      schoolStatus,
      supervisorFilter,
      governorateFilter
    } = filters;

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

      return true;
    });
  }


  function getAdminReportProgressTitle(
    reportType,
    evacuationPlan
  ) {
    if (reportType === 'all') {
      return 'الإنجاز العام لجميع التقارير';
    }

    if (reportType === 'evacuation') {
      return evacuationPlan === 'all'
        ? 'اكتمال خطط الإخلاء الأربع'
        : `نسبة إنجاز ${
            EVACUATION_PLAN_LABELS[evacuationPlan]
          }`;
    }

    return `نسبة إنجاز ${
      REPORT_TYPE_LABELS[reportType] || ''
    }`;
  }


  function renderAdminReportProgress(
    schools,
    filters
  ) {
    const total = schools.length;
    const completed = schools.filter(
      school =>
        isSelectedReportCompleted(
          school,
          {
            reportType: filters.reportType,
            evacuationPlan:
              filters.evacuationPlan
          }
        )
    ).length;
    const pending = total - completed;
    const percentage = total > 0
      ? Math.round((completed / total) * 100)
      : 0;

    setText(
      'adminReportProgressTitle',
      getAdminReportProgressTitle(
        filters.reportType,
        filters.evacuationPlan
      )
    );
    setText(
      'adminReportProgressPercentage',
      `${percentage}%`
    );
    setText(
      'adminReportProgressCompleted',
      completed
    );
    setText(
      'adminReportProgressPending',
      pending
    );
    setText(
      'adminReportProgressTotal',
      total
    );

    const progressBar = document.getElementById(
      'adminReportProgressBar'
    );
    const progressTrack = document.getElementById(
      'adminReportProgressTrack'
    );

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }

    if (progressTrack) {
      progressTrack.setAttribute(
        'aria-valuenow',
        String(percentage)
      );
      progressTrack.setAttribute(
        'aria-valuetext',
        `${percentage}%، ${completed} من ${total}`
      );
    }
  }


  function getFilteredAdminSchools(
    filters,
    reportScopeSchools
  ) {
    const activeFilters = filters ||
      getAdminSchoolFilterState();
    const scopeSchools = reportScopeSchools ||
      getAdminReportScopeSchools(activeFilters);

    return scopeSchools.filter(
      school => matchesReportFilter(
        school,
        {
          reportType: activeFilters.reportType,
          evacuationPlan:
            activeFilters.evacuationPlan,
          status: activeFilters.reportStatus
        }
      )
    );
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

    const filters =
      getAdminSchoolFilterState();
    const reportType = filters.reportType;
    const evacuationPlan =
      filters.evacuationPlan;

    // createSchoolCard يعيد استخدام العرض الحالي، وهذه
    // القيم تجعله يعرض تفاصيل التقرير المختار للمدير.
    currentReportTypeFilter = reportType;
    currentEvacuationPlanFilter =
      evacuationPlan;

    const reportScopeSchools =
      getAdminReportScopeSchools(filters);

    renderAdminReportProgress(
      reportScopeSchools,
      filters
    );

    const schools = getFilteredAdminSchools(
      filters,
      reportScopeSchools
    );

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


  function showAdminSchools(
    supervisorId = null,
    reportFilters = null
  ) {

    selectedAdminSupervisorId =
      supervisorId || null;

    adminSupervisorsPanel?.classList.add(
      'hidden'
    );
    adminSchoolsPanel?.classList.remove(
      'hidden'
    );

    resetAdminSchoolFilters();

    if (
      reportFilters &&
      reportFilters.reportType !== 'all'
    ) {
      const reportTypeField =
        document.getElementById(
          'adminReportTypeFilter'
        );
      const planField =
        document.getElementById(
          'adminEvacuationPlanFilter'
        );

      if (reportTypeField) {
        reportTypeField.value =
          reportFilters.reportType;
      }
      if (
        planField &&
        reportFilters.reportType ===
          'evacuation'
      ) {
        planField.value =
          reportFilters.evacuationPlan;
      }
      document.getElementById(
        'adminEvacuationPlanFilterField'
      )?.classList.toggle(
        'hidden',
        reportFilters.reportType !==
          'evacuation'
      );
    }

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
    const supervisorMetric = supervisor
      ? getAdminSupervisorMetric(
          supervisor,
          reportFilters || {
            reportType: 'all',
            evacuationPlan: 'all'
          }
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
            supervisorMetric.total
          }</b></span>
          <span>نسبة الإنجاز: <b>${
            supervisorMetric.percentage
          }%</b></span>
          <span>مكتملة: <b>${
            supervisorMetric.completed
          }</b></span>
          <span>تحتاج متابعة: <b>${
            supervisorMetric.pending
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
    adminSystemStatus = data.systemStatus || {
      status: 'OPEN',
      isOpen: true,
      message: '',
      updatedAt: '',
      updatedBy: ''
    };

    populateAdminSchoolFilters();
    renderAdminStats();
    renderAdminSystemStatus();
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
    'adminSupervisorSort',
    'adminSupervisorEvacuationPlanFilter'
  ].forEach(id => {
    document.getElementById(id)
      ?.addEventListener(
        'change',
        renderAdminSupervisors
      );
  });

  document.getElementById(
    'adminSupervisorReportTypeFilter'
  )?.addEventListener('change', event => {
    if (event.target.value !== 'evacuation') {
      const planFilter = document.getElementById(
        'adminSupervisorEvacuationPlanFilter'
      );
      if (planFilter) {
        planFilter.value = 'all';
      }
    }
    renderAdminSupervisors();
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
    'adminExportSchoolsExcelButton'
  )?.addEventListener('click', () => {
    const filters =
      getAdminSchoolFilterState();

    downloadFilteredSchoolsExcel(
      getFilteredAdminSchools(filters),
      {
        reportType: filters.reportType,
        evacuationPlan:
          filters.evacuationPlan,
        supervisorName: ''
      }
    );
  });


  document.getElementById(
    'adminAllSchoolsButton'
  )?.addEventListener(
    'click',
    () => showAdminSchools()
  );


  document.getElementById(
    'adminSystemToggleButton'
  )?.addEventListener('click', async event => {
    if (!currentDashboardSession) {
      return;
    }

    const button = event.currentTarget;
    const nextStatus = button.dataset.nextStatus;
    const isClosing = nextStatus === 'CLOSED';
    const messageField = document.getElementById(
      'adminSystemClosedMessage'
    );
    const message = String(
      messageField?.value || ''
    ).trim();

    if (isClosing && !message) {
      showAdminSystemFeedback(
        'اكتب رسالة تظهر للمدارس قبل إغلاق النظام.',
        true
      );
      messageField?.focus();
      return;
    }

    const confirmed = window.confirm(
      isClosing
        ? 'هل أنت متأكد من إغلاق النظام؟ سيتم منع المدارس من الدخول والرفع والتعديل.'
        : 'هل أنت متأكد من فتح النظام للمدارس؟'
    );

    if (!confirmed) {
      return;
    }

    button.disabled = true;
    showAdminSystemFeedback(
      isClosing
        ? 'جاري إغلاق النظام...'
        : 'جاري فتح النظام...'
    );

    const result = await SafetyAPI.setSystemStatus(
      getSupervisorNationalId(
        currentDashboardSession
      ),
      nextStatus,
      message
    );

    button.disabled = false;

    if (!result || result.success !== true) {
      showAdminSystemFeedback(
        result?.message ||
        'تعذر تغيير حالة النظام.',
        true
      );
      return;
    }

    adminSystemStatus =
      result.data?.systemStatus ||
      adminSystemStatus;
    renderAdminSystemStatus();
    showAdminSystemFeedback(
      result.message ||
      'تم تحديث حالة النظام.'
    );
  });


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
