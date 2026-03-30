import {useCallback, useEffect, useState} from 'react';
import api from '../services/api';

/**
 * 通用场景选择 hook
 * 返回场景列表、当前选中场景ID、切换函数、以及已完成场景的过滤列表
 */
const useSceneSelector = (onlyDone = false) => {
    const [scenes, setScenes]         = useState([]);
    const [activeId, setActiveId]     = useState(null);
    const [loadingScenes, setLoading] = useState(false);

    const loadScenes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/scenes');
            const list = res?.data || [];
            setScenes(list);
            // 默认选第一个有结果的场景（onlyDone模式）或第一个场景
            if (!activeId) {
                const defaultScene = onlyDone
                    ? list.find(s => s.status === 'done' || s.task_status === 'done')
                    : list[0];
                if (defaultScene) setActiveId(defaultScene.id);
            }
        } catch (_) {} finally { setLoading(false); }
    }, [activeId, onlyDone]);

    useEffect(() => { loadScenes(); }, []); // eslint-disable-line

    const doneScenes   = scenes.filter(s => s.status === 'done' || s.task_status === 'done');
    const selectScenes = onlyDone ? doneScenes : scenes;

    return {scenes, selectScenes, activeId, setActiveId, loadingScenes, loadScenes, doneScenes};
};

export default useSceneSelector;
