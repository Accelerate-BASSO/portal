interface PlatformIconProps {
  platform: string;
  className?: string;
}

const platformLabels: Record<string, string> = {
  GitHub: "GitHub",
  BioPortal: "BioPortal",
  Zenodo: "Zenodo",
  OSF: "OSF",
  Website: "Web",
  Discourse: "Discourse",
  Other: "Link",
};

const platformColors: Record<string, string> = {
  GitHub: "bg-gray-800 text-white",
  BioPortal: "bg-blue-600 text-white",
  Zenodo: "bg-blue-800 text-white",
  OSF: "bg-green-700 text-white",
  Website: "bg-indigo-500 text-white",
  Discourse: "bg-amber-500 text-white",
  Other: "bg-gray-500 text-white",
};

export default function PlatformIcon({ platform, className = "" }: PlatformIconProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${platformColors[platform] || platformColors.Other} ${className}`}
    >
      {platformLabels[platform] || platform}
    </span>
  );
}
