import { defineDoc, defineDocFamily, defineEntry } from '@earendil-works/pi-durable';
import { ARTIFACT, artifactBlocks } from '@repo/contracts/universal';
import * as m from '@repo/i18n/messages';
import { artifactBlockSchemas } from '../../types/artifact.types';
import type { ArtifactContent, ArtifactDocument, ArtifactVersionData } from '../../types/artifact.types';

export const artifactDocument = defineDoc<ArtifactDocument>({
  kind: ARTIFACT.docKind,
  version: 1,
  scope: 'conversation',
  history: 'latest',
  fork: 'initial',
  initial: () => ({ artifacts: {} }),
  checkpointWhen: () => false,
});

export const artifactContent = defineDocFamily<ArtifactContent, null>({
  kind: ARTIFACT.contentKind,
  version: 1,
  scope: 'conversation',
  family: true,
  history: 'latest',
  fork: 'initial',
  initial: () => ({ spec: null }),
  checkpointWhen: () => false,
});

export const artifactVersionEntry = defineEntry<ArtifactVersionData>(ARTIFACT.entryKind);

const ARTIFACT_BLOCK_DESCRIPTIONS = {
  ui_artifact_block_stack_description: m.ui_artifact_block_stack_description,
  ui_artifact_block_grid_description: m.ui_artifact_block_grid_description,
  ui_artifact_block_card_description: m.ui_artifact_block_card_description,
  ui_artifact_block_heading_description: m.ui_artifact_block_heading_description,
  ui_artifact_block_text_description: m.ui_artifact_block_text_description,
  ui_artifact_block_stat_description: m.ui_artifact_block_stat_description,
  ui_artifact_block_badge_description: m.ui_artifact_block_badge_description,
  ui_artifact_block_list_description: m.ui_artifact_block_list_description,
  ui_artifact_block_table_description: m.ui_artifact_block_table_description,
  ui_artifact_block_progress_description: m.ui_artifact_block_progress_description,
  ui_artifact_block_separator_description: m.ui_artifact_block_separator_description,
  ui_artifact_block_line_chart_description: m.ui_artifact_block_line_chart_description,
  ui_artifact_block_bar_chart_description: m.ui_artifact_block_bar_chart_description,
  ui_artifact_block_checklist_description: m.ui_artifact_block_checklist_description,
  ui_artifact_block_toggle_description: m.ui_artifact_block_toggle_description,
  ui_artifact_block_tabs_description: m.ui_artifact_block_tabs_description,
  ui_artifact_block_section_description: m.ui_artifact_block_section_description,
  ui_artifact_block_markdown_description: m.ui_artifact_block_markdown_description,
  ui_artifact_block_key_value_description: m.ui_artifact_block_key_value_description,
  ui_artifact_block_status_description: m.ui_artifact_block_status_description,
  ui_artifact_block_alert_description: m.ui_artifact_block_alert_description,
  ui_artifact_block_link_button_description: m.ui_artifact_block_link_button_description,
  ui_artifact_block_image_description: m.ui_artifact_block_image_description,
  ui_artifact_block_area_chart_description: m.ui_artifact_block_area_chart_description,
  ui_artifact_block_pie_chart_description: m.ui_artifact_block_pie_chart_description,
  ui_artifact_block_select_description: m.ui_artifact_block_select_description,
  ui_artifact_block_notes_description: m.ui_artifact_block_notes_description,
  ui_artifact_block_metric_description: m.ui_artifact_block_metric_description,
  ui_artifact_block_sparkline_description: m.ui_artifact_block_sparkline_description,
  ui_artifact_block_gauge_description: m.ui_artifact_block_gauge_description,
  ui_artifact_block_usage_meter_description: m.ui_artifact_block_usage_meter_description,
  ui_artifact_block_heatmap_description: m.ui_artifact_block_heatmap_description,
};

export const ARTIFACT_BLOCKS_CATALOG = artifactBlocks.parse(Object.fromEntries(Object.entries(artifactBlockSchemas).map(([name, block]) => [
  name,
  {
    description: ARTIFACT_BLOCK_DESCRIPTIONS[block.description](),
    props: block.props,
  },
])));
