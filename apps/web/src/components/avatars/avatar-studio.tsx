import { DEFAULT_EXPRESSION, EXPRESSIONS } from '@orbs/avatar-blobs/expressions';
import { BODIES, COLORS, DEFAULT_BODY, DEFAULT_COLOR } from '@orbs/avatar-blobs/skins';
import { SEQUENCE, stateDef } from '@orbs/avatar-blobs/states';
import { m } from '@orbs/i18n/client';
import { useEffect, useState } from 'react';
import { AvatarBlob } from '@/components/avatars/avatar-blob';
import { LayoutHeader } from '@/components/layout/layout-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label, LabelDescription } from '@/components/ui/label';
import { AVATAR_BODY_LABELS, AVATAR_COLOR_LABELS, AVATAR_EXPRESSION_LABELS } from '@/services/avatar/avatar.constants';
import type { ExpressionId } from '@orbs/avatar-blobs/expressions';
import type { BodyId, ColorId } from '@orbs/avatar-blobs/skins';
import type { StateId } from '@orbs/avatar-blobs/states';

const STATE_LABELS = {
  idle: m.avatars_state_idle,
  thinking: m.avatars_state_thinking,
  wink: m.avatars_state_wink,
  wide: m.avatars_state_wide,
  alert: m.avatars_state_alert,
  notify: m.avatars_state_notify,
  exclaim: m.avatars_state_exclaim,
  sleep: m.avatars_state_sleep,
  egg: m.avatars_state_egg,
  hexagon: m.avatars_state_hexagon,
  play: m.avatars_state_play,
  orbit: m.avatars_state_orbit,
  burst: m.avatars_state_burst,
  comet: m.avatars_state_comet,
} satisfies Record<Exclude<StateId, 'swirl'>, () => string>;

const CATALOGUE = SEQUENCE.filter((id): id is Exclude<StateId, 'swirl'> => id !== 'swirl');

function useStateThenIdleLoop(state: StateId): StateId {
  const [restingFrom, setRestingFrom] = useState<StateId | null>(null);

  useEffect(() => {
    if (state === 'idle') {
      return;
    }

    let resting = false;
    let timer = 0;

    const schedule = () => {
      timer = window.setTimeout(() => {
        resting = !resting;
        setRestingFrom(resting ? state : null);
        schedule();
      }, stateDef(resting ? 'idle' : state).duration * 1000);
    };

    schedule();

    return () => window.clearTimeout(timer);
  }, [state]);

  const showingIdleBreak = restingFrom === state;

  return showingIdleBreak ? 'idle' : state;
}

interface AvatarStudioPickerProps<T extends string> {
  label: string
  options: { id: T; label: string; swatch?: string }[]
  value: T
  onChange: (id: T) => void
}

function AvatarStudioPicker<T extends string>({ label, options, value, onChange }: AvatarStudioPickerProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <Button
            aria-label={option.swatch ? option.label : undefined}
            aria-pressed={option.id === value}
            key={option.id}
            size={option.swatch ? 'icon' : 'sm'}
            title={option.swatch ? option.label : undefined}
            variant={option.id === value ? 'primary' : 'outline'}
            onClick={() => onChange(option.id)}
          >
            {option.swatch ? <span className="size-5 ring-1 ring-border" style={{ backgroundColor: option.swatch }} /> : option.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

function AvatarStudioTile({ state, body, color, expression }: { state: Exclude<StateId, 'swirl'>; body: BodyId; color: ColorId; expression: ExpressionId }) {
  const shown = useStateThenIdleLoop(state);

  return (
    <li className="flex flex-col items-center gap-2">
      <AvatarBlob
        body={body}
        className="h-auto max-w-full"
        color={color}
        expression={expression}
        fps={30}
        label={STATE_LABELS[state]()}
        size={128}
        state={shown}
      />
      <span className="text-xs text-muted-foreground">{STATE_LABELS[state]()}</span>
    </li>
  );
}

export function AvatarStudio() {
  const [body, setBody] = useState<BodyId>(DEFAULT_BODY);
  const [color, setColor] = useState<ColorId>(DEFAULT_COLOR);
  const [expression, setExpression] = useState<ExpressionId>(DEFAULT_EXPRESSION);
  const [state, setState] = useState<Exclude<StateId, 'swirl'>>('idle');
  const [follow, setFollow] = useState(false);
  const shown = useStateThenIdleLoop(state);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <LayoutHeader />
      <div className="flex flex-col gap-10 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-xl font-semibold">{m.avatars_title()}</h1>
          <p className="text-sm text-muted-foreground">{m.avatars_intro()}</p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[auto_1fr]">
          <AvatarBlob
            body={body}
            className="mx-auto h-auto max-w-full"
            color={color}
            expression={expression}
            follow={follow}
            label={m.avatars_preview_label()}
            size={320}
            state={shown}
          />
          <div className="flex flex-col gap-6">
            <AvatarStudioPicker
              label={m.avatars_state()}
              options={CATALOGUE.map((id) => ({ id, label: STATE_LABELS[id]() }))}
              value={state}
              onChange={setState}
            />
            <AvatarStudioPicker
              label={m.avatars_body()}
              options={BODIES.map(({ id }) => ({ id, label: AVATAR_BODY_LABELS[id]() }))}
              value={body}
              onChange={setBody}
            />
            <AvatarStudioPicker
              label={m.avatars_color()}
              options={COLORS.map(({ id, hex }) => ({ id, label: AVATAR_COLOR_LABELS[id](), swatch: hex }))}
              value={color}
              onChange={setColor}
            />
            <AvatarStudioPicker
              label={m.avatars_expression()}
              options={EXPRESSIONS.map(({ id }) => ({ id, label: AVATAR_EXPRESSION_LABELS[id]() }))}
              value={expression}
              onChange={setExpression}
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={follow}
                  id="avatar-follow"
                  onCheckedChange={(checked) => setFollow(checked === true)}
                />
                <Label htmlFor="avatar-follow">{m.avatars_follow()}</Label>
              </div>
              <LabelDescription>{m.avatars_follow_hint()}</LabelDescription>
            </div>
          </div>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-semibold">{m.avatars_grid()}</h2>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-6">
            {CATALOGUE.map((id) => (
              <AvatarStudioTile
                body={body}
                color={color}
                expression={expression}
                key={id}
                state={id}
              />
            ))}
          </ul>
        </section>

        <p className="text-xs text-muted-foreground">{m.avatars_credit()}</p>
      </div>
    </div>
  );
}
