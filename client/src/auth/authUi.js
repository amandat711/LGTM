/** Shared Tailwind classes for auth pages (login, register, forgot password). */

export const authCardClass =
  'mx-auto w-full max-w-[400px] rounded-lg border border-[#e4e4e4] bg-white p-8 shadow-[0_1px_6px_rgba(0,0,0,0.06)]';

export const authInputClass =
  'w-full rounded-[5px] border border-[#e4e4e4] px-3 py-2.5 text-sm text-[#0f0f0f] outline-none transition-[border-color,box-shadow] placeholder:text-[#999] focus:border-mcgill-red focus:ring-2 focus:ring-mcgill-red/20';

export const authLabelClass = 'text-[13px] font-medium text-[#0f0f0f]';

export const authPrimaryBtnClass =
  'mt-1 rounded-[5px] bg-mcgill-red py-2.5 text-[13px] font-medium text-white transition-[background-color,transform] hover:bg-mcgill-redDark hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0';

/** McGill booking domains */
export function isAllowedMcGillEmail(email) {
  const e = email.trim().toLowerCase();
  return e.endsWith('@mail.mcgill.ca') || e.endsWith('@mcgill.ca');
}
