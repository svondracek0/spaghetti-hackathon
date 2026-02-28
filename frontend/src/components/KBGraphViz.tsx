import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { KBGraphData, KBGraphNode } from '../types';
import { Maximize2, Minimize2 } from 'lucide-react';

interface KBGraphVizProps {
    data: KBGraphData;
}

export const KBGraphViz: React.FC<KBGraphVizProps> = ({ data }) => {
    const isDark = document.documentElement.classList.contains('dark');
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: isFullscreen ? window.innerHeight - 80 : 400
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        // Small delay to ensure container is fully rendered before measuring
        setTimeout(updateDimensions, 50);

        return () => window.removeEventListener('resize', updateDimensions);
    }, [isFullscreen]);

    const toggleFullscreen = () => {
        if (!isFullscreen) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        }
        setIsFullscreen(!isFullscreen);
    };

    // Color palette based on node types
    const nodeColors = useMemo(() => {
        return {
            'PERSON': isDark ? '#ec4899' : '#db2777',
            'ORGANIZATION': isDark ? '#3b82f6' : '#2563eb',
            'LOCATION': isDark ? '#eab308' : '#ca8a04',
            'EVENT': isDark ? '#22c55e' : '#16a34a',
            'CONCEPT': isDark ? '#a855f7' : '#9333ea',
            'DEFAULT': isDark ? '#64748b' : '#94a3b8'
        };
    }, [isDark]);

    const getNodeColor = (node: KBGraphNode) => {
        const type = node.type?.toUpperCase() || 'DEFAULT';
        return nodeColors[type as keyof typeof nodeColors] || nodeColors.DEFAULT;
    };

    return (
        <div
            ref={containerRef}
            className={`relative rounded-xl border border-border overflow-hidden bg-card/50 ${isFullscreen ? 'h-screen w-screen flex flex-col items-center justify-center p-4 bg-background z-50' : 'w-full'}`}
        >
            <button
                onClick={toggleFullscreen}
                className="absolute top-4 right-4 z-10 p-2 bg-background/80 hover:bg-muted backdrop-blur-sm rounded-md border border-border text-foreground transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <div className="w-full h-full flex items-center justify-center" style={{ height: dimensions.height }}>
                {dimensions.width > 0 && (
                    <ForceGraph2D
                        width={dimensions.width}
                        height={dimensions.height}
                        graphData={data}
                        nodeAutoColorBy="type"
                        nodeLabel={(node: any) => `${node.name} (${node.type})`}
                        nodeColor={(node: any) => getNodeColor(node)}
                        nodeRelSize={4}
                        nodeVal={(node: any) => Math.log(node.val + 2) * 2}
                        linkColor={() => 'rgba(255,255,255,0.3)'}
                        linkWidth={0.5}
                        linkDirectionalArrowLength={2}
                        linkDirectionalArrowRelPos={1}
                        backgroundColor={isDark ? '#0f1729' : '#1e293b'}
                        d3VelocityDecay={0.3}
                    />
                )}
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 max-w-[80%]">
                {['PERSON', 'ORGANIZATION', 'LOCATION', 'EVENT', 'CONCEPT'].map(type => (
                    <div key={type} className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-muted-foreground border border-border shadow-sm">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: nodeColors[type as keyof typeof nodeColors] }} />
                        {type}
                    </div>
                ))}
            </div>
        </div>
    );
};
