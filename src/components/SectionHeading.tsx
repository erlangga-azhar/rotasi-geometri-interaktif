import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
}

function SectionHeading({ eyebrow, title, description, icon: Icon, action }: SectionHeadingProps) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
        <Icon size={13} />
        {eyebrow}
      </span>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base dark:text-slate-400">
        {description}
      </p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export default SectionHeading;
