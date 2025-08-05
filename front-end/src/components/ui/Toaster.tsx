import React from 'react';

export const Toaster: React.FC = () => {
  return (
    <div id="toast-container" className="fixed top-4 right-4 z-50 space-y-2">
      {/* Toast notifications will be rendered here */}
    </div>
  );
};