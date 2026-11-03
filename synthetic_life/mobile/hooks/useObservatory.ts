import { useMemo } from 'react';
import { useSimulation } from '@/context/SimulationContext';
import type { BiomeId, Entity, Genome, Tribe } from '@/engine/types';

export interface SpeciesSummary {
  speciesId: string;
  speciesName: string;
  livingCount: number;
  totalEver: number;
  representative: Entity;
  avgIntelligence: number;
  dominantBiome: BiomeId;
}

export function useObservatoryAnalytics() {
  const { simState } = useSimulation();

  return useMemo(() => {
    const allEntities = simState.entities ?? [];
    const living = allEntities.filter((e) => e.isAlive);
    const fallen = allEntities
      .filter((e) => !e.isAlive)
      .sort((a, b) => (b.diedAtTick ?? 0) - (a.diedAtTick ?? 0));

    const speciesMap = new Map<
      string,
      {
        speciesId: string;
        speciesName: string;
        living: Entity[];
        all: Entity[];
      }
    >();

    for (const ent of allEntities) {
      let entry = speciesMap.get(ent.speciesId);
      if (!entry) {
        entry = {
          speciesId: ent.speciesId,
          speciesName: ent.speciesName,
          living: [],
          all: [],
        };
        speciesMap.set(ent.speciesId, entry);
      }
      entry.all.push(ent);
      if (ent.isAlive) entry.living.push(ent);
    }

    const speciesList: SpeciesSummary[] = Array.from(speciesMap.values())
      .map((s) => {
        const activePool = s.living.length > 0 ? s.living : s.all;
        const avgInt =
          activePool.reduce((acc, e) => acc + (e.intelligence ?? 0), 0) /
          Math.max(1, activePool.length);

        const biomeCounts = new Map<BiomeId, number>();
        for (const e of activePool) {
          biomeCounts.set(e.currentBiome, (biomeCounts.get(e.currentBiome) ?? 0) + 1);
        }
        let dominantBiome: BiomeId = activePool[0]?.currentBiome ?? 'eden';
        let bestCount = -1;
        biomeCounts.forEach((cnt, b) => {
          if (cnt > bestCount) {
            bestCount = cnt;
            dominantBiome = b;
          }
        });

        return {
          speciesId: s.speciesId,
          speciesName: s.speciesName,
          livingCount: s.living.length,
          totalEver: s.all.length,
          representative: s.living[0] ?? s.all[0],
          avgIntelligence: avgInt,
          dominantBiome,
        };
      })
      .sort((a, b) => b.livingCount - a.livingCount || b.totalEver - a.totalEver);

    const activeSpeciesCount = speciesList.filter((s) => s.livingCount > 0).length;

    const activeTribes: Tribe[] = (simState.tribes ?? []).filter(
      (t) => t.memberIds.length > 0
    );

    const maxGeneration = allEntities.reduce(
      (mx, e) => Math.max(mx, e.generation || 1),
      1
    );

    const avgGenome: Genome = {
      curiosity: 0.5,
      empathy: 0.5,
      aggression: 0.5,
      creativity: 0.5,
      survivalDrive: 0.5,
      sociability: 0.5,
      speedGene: 0.5,
      sizeGene: 0.5,
      senseGene: 0.5,
      bioluminescence: 0.5,
    };

    if (living.length > 0) {
      const keys = Object.keys(avgGenome) as Array<keyof Genome>;
      for (const k of keys) {
        avgGenome[k] =
          living.reduce((sum, e) => sum + (e.genome[k] ?? 0.5), 0) / living.length;
      }
    }

    const avgIntelligence =
      living.length > 0
        ? living.reduce((sum, e) => sum + (e.intelligence ?? 0), 0) / living.length
        : 0;

    return {
      living,
      fallen,
      allEntities,
      speciesList,
      activeSpeciesCount,
      activeTribes,
      maxGeneration,
      avgGenome,
      avgIntelligence,
    };
  }, [simState]);
}
