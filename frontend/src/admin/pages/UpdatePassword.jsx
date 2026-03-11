import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminPageShell from "../components/AdminPageShell/AdminPageShell";
import "./updatePassword.css";

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 5c5.23 0 9.27 3.11 11 7-1.73 3.89-5.77 7-11 7S2.73 15.89 1 12c1.73-3.89 5.77-7 11-7zm0 2C8.18 7 5.11 9.07 3.35 12 5.11 14.93 8.18 17 12 17s6.89-2.07 8.65-5C18.89 9.07 15.82 7 12 7zm0 1.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.29 3.71 1 5l4.03 4.03A11.8 11.8 0 0 0 1 12c1.73 3.89 5.77 7 11 7a11.3 11.3 0 0 0 4.22-.79L19 21l1.29-1.29zM12 17c-3.82 0-6.89-2.07-8.65-5a9.77 9.77 0 0 1 3.14-3.36l1.53 1.53A3.94 3.94 0 0 0 8 10.5 4 4 0 0 0 13.5 16l1.67 1.67A9.2 9.2 0 0 1 12 17zm0-10c5.23 0 9.27 3.11 11 7a12.14 12.14 0 0 1-3.42 4.45l-1.43-1.43A10 10 0 0 0 20.65 12C18.89 9.07 15.82 7 12 7a9.1 9.1 0 0 0-2.84.44L7.51 5.79A11.86 11.86 0 0 1 12 7zm-1.86 1.96 5.9 5.9A3.96 3.96 0 0 0 16 14.5 4 4 0 0 0 9.5 8c0 .38.05.66.14.96z"
      />
    </svg>
  );
}

function CheckItem({ ok, text }) {
  return (
    <div className={`jw-adminPwCheckItem ${ok ? "is-ok" : "is-pending"}`}>
      <span className="jw-adminPwCheckItem__icon">{ok ? "✓" : "○"}</span>
      <span>{text}</span>
    </div>
  );
}

function SuccessPopup() {
  return (
    <div className="jw-adminPwPopupOverlay">
      <div className="jw-adminPwPopup">
        <div className="jw-adminPwPopup__icon">✓</div>
        <div className="jw-adminPwPopup__title">Password Updated</div>
        <div className="jw-adminPwPopup__text">
          Your password has been updated successfully.
        </div>
      </div>
    </div>
  );
}

export default function UpdatePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    repeatPassword: "",
  });

  const [show, setShow] = useState({
    currentPassword: false,
    newPassword: false,
    repeatPassword: false,
  });

  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    repeatPassword: "",
    submit: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const checks = useMemo(() => {
    const newPw = form.newPassword || "";
    const repeatPw = form.repeatPassword || "";

    return {
      minLength: newPw.length >= 6,
      upper: /[A-Z]/.test(newPw),
      lower: /[a-z]/.test(newPw),
      number: /[0-9]/.test(newPw),
      repeatMinLength: repeatPw.length >= 6,
      repeatUpper: /[A-Z]/.test(repeatPw),
      repeatLower: /[a-z]/.test(repeatPw),
      repeatNumber: /[0-9]/.test(repeatPw),
      match: repeatPw.length > 0 && newPw === repeatPw,
    };
  }, [form.newPassword, form.repeatPassword]);

  useEffect(() => {
    if (!showSuccess) return;

    const t = window.setTimeout(() => {
      navigate("/admin", { replace: true });
    }, 3000);

    return () => window.clearTimeout(t);
  }, [showSuccess, navigate]);

  const onChangeField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "", submit: "" }));
  };

  const toggleShow = (key) => {
    setShow((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const validateForm = () => {
    const nextErrors = {
      currentPassword: "",
      newPassword: "",
      repeatPassword: "",
      submit: "",
    };

    if (!form.currentPassword.trim()) {
      nextErrors.currentPassword = "Please enter your current password.";
    }

    if (!form.newPassword) {
      nextErrors.newPassword = "Please enter a new password.";
    } else {
      if (form.newPassword.length < 6) {
        nextErrors.newPassword = "New password must be at least 6 characters.";
      } else if (!/[A-Z]/.test(form.newPassword)) {
        nextErrors.newPassword =
          "New password must contain at least 1 uppercase letter.";
      } else if (!/[a-z]/.test(form.newPassword)) {
        nextErrors.newPassword =
          "New password must contain at least 1 lowercase letter.";
      } else if (!/[0-9]/.test(form.newPassword)) {
        nextErrors.newPassword =
          "New password must contain at least 1 number.";
      }
    }

    if (!form.repeatPassword) {
      nextErrors.repeatPassword = "Please repeat your new password.";
    } else if (form.repeatPassword !== form.newPassword) {
      nextErrors.repeatPassword = "Repeat password does not match.";
    }

    setErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };

  const handleCancel = () => {
    navigate("/admin");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors((prev) => ({ ...prev, submit: "" }));

    try {
      const token = localStorage.getItem("token") || "";
      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

      const response = await fetch(`${apiBase}/admin/update-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrors((prev) => ({
          ...prev,
          submit:
            data?.message ||
            "Unable to update password. Please check your current password and try again.",
        }));
        setIsSubmitting(false);
        return;
      }

      setShowSuccess(true);
      setIsSubmitting(false);
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        submit:
          "Something went wrong while updating the password. Please try again.",
      }));
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AdminPageShell
        title="Update Password"
        table={
          <div className="jw-adminPwPage">
            <div className="jw-adminPwCard">
              <form className="jw-adminPwForm" onSubmit={handleSubmit}>
                <div className="jw-adminPwIntro">
                  <div className="jw-adminPwIntro__title">Change Password</div>
                  <div className="jw-adminPwIntro__text">
                    Update your admin account password securely. Your new
                    password must meet the required conditions below.
                  </div>
                </div>

                <div className="jw-adminPwGrid">
                  <div className="jw-adminPwField">
                    <label className="jw-adminPwLabel">Current Password</label>
                    <div className="jw-adminPwInputWrap">
                      <input
                        type={show.currentPassword ? "text" : "password"}
                        className={`jw-adminPwInput ${
                          errors.currentPassword ? "is-error" : ""
                        }`}
                        value={form.currentPassword}
                        onChange={(e) =>
                          onChangeField("currentPassword", e.target.value)
                        }
                        placeholder="Please Enter"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="jw-adminPwEye"
                        onClick={() => toggleShow("currentPassword")}
                        aria-label={
                          show.currentPassword
                            ? "Hide current password"
                            : "Show current password"
                        }
                      >
                        <EyeIcon open={show.currentPassword} />
                      </button>
                    </div>
                    {errors.currentPassword ? (
                      <div className="jw-adminPwError">
                        {errors.currentPassword}
                      </div>
                    ) : null}
                  </div>

                  <div className="jw-adminPwField">
                    <label className="jw-adminPwLabel">Add New Password</label>
                    <div className="jw-adminPwInputWrap">
                      <input
                        type={show.newPassword ? "text" : "password"}
                        className={`jw-adminPwInput ${
                          errors.newPassword ? "is-error" : ""
                        }`}
                        value={form.newPassword}
                        onChange={(e) =>
                          onChangeField("newPassword", e.target.value)
                        }
                        placeholder="Please Enter"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="jw-adminPwEye"
                        onClick={() => toggleShow("newPassword")}
                        aria-label={
                          show.newPassword
                            ? "Hide new password"
                            : "Show new password"
                        }
                      >
                        <EyeIcon open={show.newPassword} />
                      </button>
                    </div>
                    {errors.newPassword ? (
                      <div className="jw-adminPwError">{errors.newPassword}</div>
                    ) : null}

                    <div className="jw-adminPwChecks">
                      <CheckItem
                        ok={checks.minLength}
                        text="Minimum 6 characters"
                      />
                      <CheckItem
                        ok={checks.upper}
                        text="At least 1 uppercase letter"
                      />
                      <CheckItem
                        ok={checks.lower}
                        text="At least 1 lowercase letter"
                      />
                      <CheckItem ok={checks.number} text="At least 1 number" />
                    </div>
                  </div>

                  <div className="jw-adminPwField">
                    <label className="jw-adminPwLabel">
                      Repeat New Password
                    </label>
                    <div className="jw-adminPwInputWrap">
                      <input
                        type={show.repeatPassword ? "text" : "password"}
                        className={`jw-adminPwInput ${
                          errors.repeatPassword ? "is-error" : ""
                        }`}
                        value={form.repeatPassword}
                        onChange={(e) =>
                          onChangeField("repeatPassword", e.target.value)
                        }
                        placeholder="Please Enter"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="jw-adminPwEye"
                        onClick={() => toggleShow("repeatPassword")}
                        aria-label={
                          show.repeatPassword
                            ? "Hide repeat password"
                            : "Show repeat password"
                        }
                      >
                        <EyeIcon open={show.repeatPassword} />
                      </button>
                    </div>
                    {errors.repeatPassword ? (
                      <div className="jw-adminPwError">
                        {errors.repeatPassword}
                      </div>
                    ) : null}

                    <div className="jw-adminPwChecks">
                      <CheckItem
                        ok={checks.repeatMinLength}
                        text="Minimum 6 characters"
                      />
                      <CheckItem
                        ok={checks.repeatUpper}
                        text="At least 1 uppercase letter"
                      />
                      <CheckItem
                        ok={checks.repeatLower}
                        text="At least 1 lowercase letter"
                      />
                      <CheckItem
                        ok={checks.repeatNumber}
                        text="At least 1 number"
                      />
                      <CheckItem
                        ok={checks.match}
                        text="Must match new password"
                      />
                    </div>
                  </div>
                </div>

                {errors.submit ? (
                  <div className="jw-adminPwSubmitError">{errors.submit}</div>
                ) : null}

                <div className="jw-adminPwActions">
                  <button
                    type="button"
                    className="jw-adminPwBtn jw-adminPwBtn--light"
                    onClick={handleCancel}
                    disabled={isSubmitting || showSuccess}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="jw-adminPwBtn jw-adminPwBtn--green"
                    disabled={isSubmitting || showSuccess}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        }
      />

      {showSuccess ? <SuccessPopup /> : null}
    </>
  );
}