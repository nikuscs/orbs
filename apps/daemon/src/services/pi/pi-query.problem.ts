import { log } from '@orbs/logger/daemon';
import { PI } from './pi.constants';
import type { PiServiceDeps } from '#/types/pi.types';
import type { DaemonPiProblem } from '@orbs/server/daemon';

export function piQueryProblem(deps: PiServiceDeps): Promise<DaemonPiProblem | null> {
  async function piReadVersion(serviceDeps: PiServiceDeps): Promise<string> {
    const versionCheck = Bun.spawn([PI.command, '--version'], {
      env: serviceDeps.processEnv,
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'ignore',
    });

    return (await new Response(versionCheck.stdout).text()).trim();
  }

  async function piCheckVersion(serviceDeps: PiServiceDeps): Promise<DaemonPiProblem | null> {
    if (!Bun.which(PI.command, { PATH: serviceDeps.processEnv.PATH ?? '' })) {
      log.error({
        tag: 'daemon',
        message: 'pi is not installed: install pi from https://pi.dev, make sure `pi` is on the PATH the daemon starts with, then restart the daemon',
        path: serviceDeps.processEnv.PATH,
      });

      return { code: 'pi_missing' };
    }

    const version = await piReadVersion(serviceDeps);

    if (Bun.semver.satisfies(version, `>=${PI.minimumVersion}`)) {
      return null;
    }

    log.error({
      tag: 'daemon',
      message: `pi ${version} is too old: update pi to ${PI.minimumVersion} or newer, then restart the daemon`,
    });

    return { code: 'pi_outdated', version, minimum: PI.minimumVersion };
  }

  deps.versionCheck.problem ??= piCheckVersion(deps);

  return deps.versionCheck.problem;
}
