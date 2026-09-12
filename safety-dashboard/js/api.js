/**
 * =========================================================
 * API - لوحة متابعة الأمن والسلامة المدرسية
 * =========================================================
 */

const SafetyAPI = (() => {

  /**
   * =========================================================
   * رابط Web App الخاص بـ Google Apps Script
   * =========================================================
   */
  const BASE_URL =
    'https://script.google.com/macros/s/AKfycbyHmXTwU5v69zZHueQl3qevTuICizaNHdL46edmoLoCtxIbLJbtczRW9f4tae2lOT10/exec';


  /**
   * =========================================================
   * تنظيف السجل المدني
   * =========================================================
   */
  function normalizeNationalId(value) {

    return String(value || '')
      .replace(/\D/g, '')
      .trim();
  }


  /**
   * =========================================================
   * التحقق من صحة السجل المدني
   * =========================================================
   */
  function isValidNationalId(value) {

    const nationalId =
      normalizeNationalId(value);

    return /^[12]\d{9}$/.test(
      nationalId
    );
  }


  /**
   * =========================================================
   * إرسال طلب POST
   * =========================================================
   */
  async function post(data) {

    try {

      const response =
        await fetch(BASE_URL, {

          method: 'POST',

          headers: {
            'Content-Type':
              'text/plain;charset=utf-8'
          },

          body: JSON.stringify(data)
        });


      if (!response.ok) {

        throw new Error(
          `HTTP_ERROR_${response.status}`
        );
      }


      const result =
        await response.json();


      return result;


    } catch (error) {

      console.error(
        'SafetyAPI POST Error:',
        error
      );


      return {
        success: false,
        error: 'NETWORK_ERROR',
        message:
          'تعذر الاتصال بالنظام. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
      };
    }
  }


  /**
   * =========================================================
   * إرسال طلب GET
   * =========================================================
   */
  async function get(
    action,
    params = {}
  ) {

    try {

      /*
       * تكوين الرابط بطريقة آمنة
       */
      const url =
        new URL(BASE_URL);


      url.searchParams.set(
        'action',
        action
      );


      /*
       * إضافة المعاملات
       */
      Object.entries(params)
        .forEach(
          ([key, value]) => {

            if (
              value !== undefined &&
              value !== null &&
              value !== ''
            ) {

              url.searchParams.set(
                key,
                String(value)
              );
            }
          }
        );


      const response =
        await fetch(
          url.toString(),
          {
            method: 'GET',

            /*
             * منع استخدام بيانات قديمة
             * أثناء تطوير النظام
             */
            cache: 'no-store'
          }
        );


      if (!response.ok) {

        throw new Error(
          `HTTP_ERROR_${response.status}`
        );
      }


      const result =
        await response.json();


      return result;


    } catch (error) {

      console.error(
        'SafetyAPI GET Error:',
        error
      );


      return {
        success: false,
        error: 'NETWORK_ERROR',
        message:
          'تعذر الاتصال بالنظام. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
      };
    }
  }


  /**
   * =========================================================
   * تسجيل دخول المشرف / المدير
   * =========================================================
   */
  async function supervisorLogin(
    nationalId
  ) {

    const cleanNationalId =
      normalizeNationalId(
        nationalId
      );


    /*
     * التحقق من السجل المدني
     * قبل إرسال الطلب إلى الخادم
     */
    if (
      !isValidNationalId(
        cleanNationalId
      )
    ) {

      return {
        success: false,
        error: 'INVALID_NATIONAL_ID',
        message:
          'يرجى إدخال سجل مدني صحيح مكون من 10 أرقام.'
      };
    }


    return post({

      action:
        'supervisorLogin',

      nationalId:
        cleanNationalId

    });
  }


  /**
   * =========================================================
   * جلب مدارس المشرف مع بيانات الإنجاز
   * =========================================================
   */
  async function getSupervisorSchools(
    nationalId
  ) {

    const cleanNationalId =
      normalizeNationalId(
        nationalId
      );


    /*
     * التحقق من السجل المدني
     */
    if (
      !isValidNationalId(
        cleanNationalId
      )
    ) {

      return {
        success: false,
        error: 'INVALID_NATIONAL_ID',
        message:
          'تعذر التحقق من السجل المدني للمشرف.'
      };
    }


    /*
     * استدعاء Apps Script
     *
     * النتيجة المتوقعة:
     *
     * {
     *   success: true,
     *   data: {
     *     supervisor: {...},
     *     totalSchools: 9,
     *     schools: [...]
     *   }
     * }
     */

    const result =
      await get(
        'getSupervisorSchools',
        {
          nationalId:
            cleanNationalId
        }
      );


    /*
     * التحقق من وجود استجابة
     */
    if (!result) {

      return {
        success: false,
        error: 'EMPTY_RESPONSE',
        message:
          'لم يتم استلام بيانات من الخادم.'
      };
    }


    /*
     * إذا أعاد Apps Script خطأ
     * نعيده كما هو للواجهة.
     */
    if (
      result.success !== true
    ) {

      return {
        success: false,

        error:
          result.error ||
          'GET_SUPERVISOR_SCHOOLS_FAILED',

        message:
          result.message ||
          'تعذر تحميل مدارس المشرف.'
      };
    }


    /*
     * التحقق من بنية البيانات
     */
    const data =
      result.data || {};


    const schools =
      Array.isArray(
        data.schools
      )
        ? data.schools
        : [];


    /*
     * إرجاع نسخة منظمة للواجهة
     */
    return {

      success: true,

      data: {

        supervisor:
          data.supervisor || null,

        totalSchools:
          Number.isFinite(
            Number(
              data.totalSchools
            )
          )
            ? Number(
                data.totalSchools
              )
            : schools.length,

        schools:
          schools
      }
    };
  }


  /**
   * =========================================================
   * جلب لوحة مدير النظام في طلب واحد
   * =========================================================
   */
  async function getAdminDashboard(
    nationalId
  ) {

    const cleanNationalId =
      normalizeNationalId(nationalId);

    if (!isValidNationalId(cleanNationalId)) {
      return {
        success: false,
        error: 'INVALID_NATIONAL_ID',
        message:
          'تعذر التحقق من السجل المدني للمدير.'
      };
    }

    const result = await get(
      'getAdminDashboard',
      { nationalId: cleanNationalId }
    );

    if (!result) {
      return {
        success: false,
        error: 'EMPTY_RESPONSE',
        message:
          'لم يتم استلام بيانات من الخادم.'
      };
    }

    if (result.success !== true) {
      return {
        success: false,
        error:
          result.error ||
          'GET_ADMIN_DASHBOARD_FAILED',
        message:
          result.message ||
          'تعذر تحميل بيانات لوحة مدير النظام.'
      };
    }

    const data = result.data || {};

    return {
      success: true,
      data: {
        admin: data.admin || null,
        summary: data.summary || {},
        supervisors: Array.isArray(
          data.supervisors
        ) ? data.supervisors : [],
        schools: Array.isArray(
          data.schools
        ) ? data.schools : []
      }
    };
  }


  /**
   * =========================================================
   * الواجهة العامة للـ API
   * =========================================================
   */
  return {

    /*
     * تسجيل الدخول
     */
    supervisorLogin,


    /*
     * جلب مدارس المشرف
     */
    getSupervisorSchools,


    /*
     * جلب لوحة مدير النظام
     */
    getAdminDashboard

  };

})();
