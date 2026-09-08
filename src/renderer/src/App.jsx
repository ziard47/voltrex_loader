import React, { useState, useEffect, useMemo, useCallback } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import DownloadTable from './components/DownloadTable';
import AddDownloadModal from './components/AddDownloadModal';
import SettingsPage from './components/SettingsPage';
import { getFileCategory } from './utils/formatters';

export default function App() {
  const [downloads, setDownloads] = useState([]);
  const [currentView, setCurrentView] = useState('downloads'); // 'downloads' | 'settings'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [concurrency, setConcurrency] = useState(3);
  const [defaultSavePath, setDefaultSavePath] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [capturedData, setCapturedData] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return window.innerWidth < 960;
  });

  // Handle window resize auto-collapse
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 800 && !isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarCollapsed]);

  // Initial load
  const loadInitialData = useCallback(async () => {
    try {
      if (window.electronAPI?.getAllDownloads) {
        const list = await window.electronAPI.getAllDownloads();
        setDownloads(list || []);
      }
      if (window.electronAPI?.getDefaultDownloadPath) {
        const defaultPath = await window.electronAPI.getDefaultDownloadPath();
        setDefaultSavePath(defaultPath || '');
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Subscribe to IPC events
    const unsubProgress = window.electronAPI?.onProgressBatch?.((batch) => {
      setDownloads((prev) => {
        const batchMap = new Map(batch.map((b) => [b.id, b]));
        return prev.map((item) => {
          const update = batchMap.get(item.id);
          if (update) {
            return {
              ...item,
              downloadedBytes: update.downloadedBytes,
              totalBytes: update.totalBytes || item.totalBytes,
              progress: update.progress,
              speed: update.speed,
              eta: update.eta
            };
          }
          return item;
        });
      });
    });

    const unsubAdded = window.electronAPI?.onTaskAdded?.((task) => {
      setDownloads((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
    });

    const unsubUpdated = window.electronAPI?.onTaskUpdated?.((task) => {
      setDownloads((prev) => {
        const exists = prev.some((t) => t.id === task.id);
        if (!exists) return [task, ...prev];
        return prev.map((t) => (t.id === task.id ? { ...t, ...task } : t));
      });
    });

    const unsubCompleted = window.electronAPI?.onTaskCompleted?.((task) => {
      setDownloads((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ...task, status: 'COMPLETED', progress: 100, speed: 0, eta: 0 } : t))
      );
    });

    const unsubDeleted = window.electronAPI?.onTaskDeleted?.((taskId) => {
      setDownloads((prev) => prev.filter((t) => t.id !== taskId));
    });

    const unsubCleared = window.electronAPI?.onTasksCleared?.(() => {
      setDownloads((prev) => prev.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status)));
    });

    const unsubCaptured = window.electronAPI?.onCapturedDownload?.((data) => {
      setCapturedData(data);
      setIsAddModalOpen(true);
    });

    const unsubTrayAdd = window.electronAPI?.onTrayOpenAddModal?.(() => {
      setCurrentView('downloads');
      setCapturedData(null);
      setIsAddModalOpen(true);
    });

    const unsubTraySettings = window.electronAPI?.onTrayOpenSettings?.(() => {
      setCurrentView('settings');
    });

    return () => {
      unsubProgress?.();
      unsubAdded?.();
      unsubUpdated?.();
      unsubCompleted?.();
      unsubDeleted?.();
      unsubCleared?.();
      unsubCaptured?.();
      unsubTrayAdd?.();
      unsubTraySettings?.();
    };
  }, [loadInitialData]);

  // Actions
  const handleAddDownload = async (payload) => {
    try {
      if (window.electronAPI?.addDownload) {
        await window.electronAPI.addDownload(payload);
      }
    } catch (err) {
      console.error('Failed to add download:', err);
    }
  };

  const handlePause = async (taskId) => {
    await window.electronAPI?.pauseDownload?.(taskId);
  };

  const handleResume = async (taskId) => {
    await window.electronAPI?.resumeDownload?.(taskId);
  };

  const handleCancel = async (taskId) => {
    await window.electronAPI?.cancelDownload?.(taskId);
  };

  const handleDelete = async (taskId, deleteFromDisk) => {
    await window.electronAPI?.deleteDownload?.(taskId, deleteFromDisk);
  };

  const handleOpenFile = async (taskId) => {
    await window.electronAPI?.openFile?.(taskId);
  };

  const handleShowInFolder = async (taskId) => {
    await window.electronAPI?.showInFolder?.(taskId);
  };

  const handleSetPriority = async (taskId, priority) => {
    await window.electronAPI?.setPriority?.(taskId, priority);
  };

  const handlePauseAll = async () => {
    await window.electronAPI?.pauseAll?.();
  };

  const handleResumeAll = async () => {
    await window.electronAPI?.resumeAll?.();
  };

  const handleStopAll = async () => {
    await window.electronAPI?.stopAll?.();
  };

  const handleClearCompleted = async () => {
    await window.electronAPI?.clearCompleted?.();
  };

  const handleConcurrencyChange = async (limit) => {
    setConcurrency(limit);
    await window.electronAPI?.setConcurrency?.(limit);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => !prev);
  };

  // Computations
  const counts = useMemo(() => {
    let all = downloads.length;
    let active = 0;
    let paused = 0;
    let completed = 0;
    let error = 0;

    for (const d of downloads) {
      if (d.status === 'DOWNLOADING' || d.status === 'QUEUED') active++;
      else if (d.status === 'PAUSED') paused++;
      else if (d.status === 'COMPLETED') completed++;
      else if (d.status === 'ERROR' || d.status === 'CANCELLED') error++;
    }

    return { all, active, paused, completed, error };
  }, [downloads]);

  const typeCounts = useMemo(() => {
    const acc = { compressed: 0, video: 0, audio: 0, documents: 0, programs: 0, others: 0 };
    for (const d of downloads) {
      const cat = getFileCategory(d.fileName, d.mimeType);
      if (acc[cat] !== undefined) acc[cat]++;
      else acc.others++;
    }
    return acc;
  }, [downloads]);

  const totalSpeed = useMemo(() => {
    return downloads.reduce((acc, task) => {
      if (task.status === 'DOWNLOADING' && task.speed > 0) {
        return acc + task.speed;
      }
      return acc;
    }, 0);
  }, [downloads]);

  const filteredDownloads = useMemo(() => {
    return downloads.filter((item) => {
      // Filter by category
      if (selectedCategory === 'active' && !['DOWNLOADING', 'QUEUED'].includes(item.status)) return false;
      if (selectedCategory === 'paused' && item.status !== 'PAUSED') return false;
      if (selectedCategory === 'completed' && item.status !== 'COMPLETED') return false;
      if (selectedCategory === 'error' && !['ERROR', 'CANCELLED'].includes(item.status)) return false;

      // Filter by file type
      if (selectedType !== 'all') {
        const cat = getFileCategory(item.fileName, item.mimeType);
        if (cat !== selectedType) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (item.fileName || '').toLowerCase().includes(q);
        const matchesUrl = (item.url || '').toLowerCase().includes(q);
        if (!matchesName && !matchesUrl) return false;
      }

      return true;
    });
  }, [downloads, selectedCategory, selectedType, searchQuery]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1D1616] text-[#EEEEEE] overflow-hidden font-sans">
      {/* Top Application Bar */}
      <TopBar
        onAddClick={() => {
          setCapturedData(null);
          setIsAddModalOpen(true);
        }}
        onPauseAll={handlePauseAll}
        onResumeAll={handleResumeAll}
        onStopAll={handleStopAll}
        onClearCompleted={handleClearCompleted}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalSpeed={totalSpeed}
        activeCount={counts.active}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Main Body with Sidebar and Data Table / Settings */}
      <div className="flex-1 w-full flex overflow-hidden min-h-0">
        <Sidebar
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            setCurrentView('downloads');
          }}
          selectedType={selectedType}
          onSelectType={(type) => {
            setSelectedType(type);
            setCurrentView('downloads');
          }}
          counts={counts}
          typeCounts={typeCounts}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        <main className="flex-1 w-full min-w-0 flex flex-col overflow-hidden bg-[#140e0e]/70">
          {currentView === 'settings' ? (
            <SettingsPage
              onBack={() => setCurrentView('downloads')}
              defaultSavePath={defaultSavePath}
              onSaveSuccess={(newSettings) => {
                if (newSettings.defaultDownloadPath) setDefaultSavePath(newSettings.defaultDownloadPath);
                if (newSettings.concurrency) setConcurrency(newSettings.concurrency);
              }}
            />
          ) : (
            <DownloadTable
              downloads={filteredDownloads}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onDelete={handleDelete}
              onOpenFile={handleOpenFile}
              onShowInFolder={handleShowInFolder}
              onSetPriority={handleSetPriority}
            />
          )}
        </main>
      </div>

      {/* Add Download Modal Dialog */}
      <AddDownloadModal
        open={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setCapturedData(null);
        }}
        onAddDownload={handleAddDownload}
        defaultSavePath={defaultSavePath}
        initialData={capturedData}
      />
    </div>
  );
}
