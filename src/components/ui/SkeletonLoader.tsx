import React from 'react';

const SkeletonCard: React.FC = () => (
  <div className="bg-white p-6 rounded-3xl border border-divider shadow-sm animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="p-6 bg-surface rounded-2xl"></div>
      <div className="w-8 h-8 bg-surface rounded-lg"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-surface rounded w-1/2"></div>
      <div className="flex items-baseline gap-2">
        <div className="h-8 bg-surface rounded w-1/3"></div>
        <div className="h-4 bg-surface rounded w-1/4"></div>
      </div>
    </div>
  </div>
);

export const SkeletonRow: React.FC = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="h-4 bg-surface rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-surface rounded w-1/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-surface rounded w-1/2"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-6 bg-surface rounded-full w-20"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-surface rounded w-1/3"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-surface rounded w-10 ml-auto"></div>
    </td>
  </tr>
);

export default SkeletonCard;
