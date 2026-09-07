/**
 * =========================================================
 * AUTH - نظام دخول المشرفين والمدير
 * =========================================================
 */

const SafetyAuth = (() => {

  const SESSION_KEY = 'safety_dashboard_session';

  /**
   * تنظيف السجل المدني
   */
  function normalizeNationalId(value) {
    return String(value || '')
      .replace(/\D/g, '')
      .trim();
  }


  /**
   * التحقق المبدئي من السجل المدني
   */
  function isValidNationalId(value) {

    const nationalId =
      normalizeNationalId(value);

    return /^[12]\d{9}$/.test(nationalId);
  }


  /**
   * =========================================================
   * تسجيل الدخول
   * =========================================================
   */
  async function login(nationalId) {

    const cleanNationalId =
      normalizeNationalId(nationalId);

    if (!isValidNationalId(cleanNationalId)) {

      return {
        success: false,
        error: 'INVALID_NATIONAL_ID',
        message:
          'يرجى إدخال سجل مدني صحيح مكون من 10 أرقام.'
      };
    }


    const result =
      await SafetyAPI.supervisorLogin(
        cleanNationalId
      );


    if (
      !result ||
      result.success !== true ||
      !result.data
    ) {

      return {
        success: false,
        error:
          result?.error || 'LOGIN_FAILED',

        message:
          result?.message ||
          'تعذر تسجيل الدخول.'
      };
    }


    const user = {

      supervisorId:
        String(
          result.data.supervisorId || ''
        ).trim(),

      nationalId:
        String(
          result.data.nationalId || ''
        ).trim(),

      name:
        String(
          result.data.name || ''
        ).trim(),

      role:
        String(
          result.data.role || ''
        ).trim(),

      phone:
        String(
          result.data.phone || ''
        ).trim()
    };


    /**
     * لا نقبل أي دور غير مصرح به.
     */
    if (
      user.role !== 'مشرف' &&
      user.role !== 'مدير'
    ) {

      return {
        success: false,
        error: 'UNAUTHORIZED_ROLE',
        message:
          'هذا الحساب غير مصرح له بالدخول إلى لوحة المتابعة.'
      };
    }


    saveSession(user);


    return {
      success: true,
      data: user
    };
  }


  /**
   * =========================================================
   * حفظ الجلسة
   * =========================================================
   */
  function saveSession(user) {

    try {

      const session = {

        supervisorId:
          user.supervisorId,

        nationalId:
          user.nationalId,

        name:
          user.name,

        role:
          user.role,

        phone:
          user.phone,

        loginAt:
          new Date().toISOString()
      };


      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(session)
      );

    } catch (error) {

      console.error(
        'تعذر حفظ جلسة المستخدم:',
        error
      );
    }
  }


  /**
   * =========================================================
   * قراءة الجلسة الحالية
   * =========================================================
   */
  function getSession() {

    try {

      const raw =
        sessionStorage.getItem(
          SESSION_KEY
        );


      if (!raw) {
        return null;
      }


      const session =
        JSON.parse(raw);


      if (
        !session ||
        !session.nationalId ||
        !session.role ||
        !session.name
      ) {

        logout();

        return null;
      }


      if (
        session.role !== 'مشرف' &&
        session.role !== 'مدير'
      ) {

        logout();

        return null;
      }


      return session;

    } catch (error) {

      console.error(
        'تعذر قراءة جلسة المستخدم:',
        error
      );

      logout();

      return null;
    }
  }


  /**
   * =========================================================
   * هل المستخدم مسجل الدخول؟
   * =========================================================
   */
  function isAuthenticated() {

    return getSession() !== null;
  }


  /**
   * =========================================================
   * هل المستخدم مدير؟
   * =========================================================
   */
  function isAdmin() {

    const session =
      getSession();

    return (
      session &&
      session.role === 'مدير'
    );
  }


  /**
   * =========================================================
   * هل المستخدم مشرف؟
   * =========================================================
   */
  function isSupervisor() {

    const session =
      getSession();

    return (
      session &&
      session.role === 'مشرف'
    );
  }


  /**
   * =========================================================
   * تسجيل الخروج
   * =========================================================
   */
  function logout() {

    try {

      sessionStorage.removeItem(
        SESSION_KEY
      );

    } catch (error) {

      console.error(
        'تعذر حذف جلسة المستخدم:',
        error
      );
    }
  }


  /**
   * =========================================================
   * الواجهة العامة
   * =========================================================
   */
  return {

    login,
    logout,

    getSession,

    isAuthenticated,
    isAdmin,
    isSupervisor,

    normalizeNationalId,
    isValidNationalId

  };

})();