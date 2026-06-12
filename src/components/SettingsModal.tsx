import { useMemo } from 'react';
import {
  Button,
  InlineNotification,
  Modal,
  Select,
  SelectItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  TextArea,
  Toggle,
} from '@carbon/react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { sanitizeCustomCss } from '../utils/customCss';
import FiltersPanel from './FiltersPanel';
import type {
  DensityType,
  ReadingWidth,
  ThemeType,
  ThreadView,
  VisibilityType,
} from '../context/SettingsContext';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const { credentials } = useAuth();

  const cssWarning = useMemo(
    () => sanitizeCustomCss(settings.customCss).warning,
    [settings.customCss],
  );

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading="Preferences"
      primaryButtonText="Done"
      onRequestSubmit={onClose}
    >
      <Tabs>
        <TabList aria-label="Settings sections">
          <Tab>General</Tab>
          {credentials && <Tab>Filters</Tab>}
        </TabList>
        <TabPanels>
          <TabPanel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingTop: '1rem' }}>
        <Select
          id="theme-select"
          labelText="Theme"
          value={settings.theme}
          onChange={(e) => updateSettings({ theme: e.target.value as ThemeType })}
        >
          <SelectItem value="auto" text="System default" />
          <SelectItem value="light" text="Light" />
          <SelectItem value="dark" text="Dark" />
          <SelectItem value="hc-light" text="High contrast (light)" />
          <SelectItem value="hc-dark" text="High contrast (dark)" />
        </Select>

        <Select
          id="density-select"
          labelText="Layout density"
          value={settings.density}
          onChange={(e) => updateSettings({ density: e.target.value as DensityType })}
        >
          <SelectItem value="cozy" text="Cozy (spacious)" />
          <SelectItem value="compact" text="Compact (dense)" />
        </Select>

        <Select
          id="thread-view-select"
          labelText="Default thread view"
          helperText="Flat reads top-to-bottom with quote context; tree indents replies under their parent."
          value={settings.threadView}
          onChange={(e) => updateSettings({ threadView: e.target.value as ThreadView })}
        >
          <SelectItem value="flat" text="Flat chronological" />
          <SelectItem value="tree" text="Indented tree" />
        </Select>

        <Select
          id="reading-width-select"
          labelText="Reading width"
          value={settings.readingWidth}
          onChange={(e) => updateSettings({ readingWidth: e.target.value as ReadingWidth })}
        >
          <SelectItem value="narrow" text="Narrow (~780 px, easier to read)" />
          <SelectItem value="wide" text="Wide (uses full screen)" />
        </Select>

        <Select
          id="visibility-select"
          labelText="Default post visibility"
          value={settings.defaultVisibility}
          onChange={(e) =>
            updateSettings({ defaultVisibility: e.target.value as VisibilityType })
          }
        >
          <SelectItem value="public" text="Public" />
          <SelectItem value="unlisted" text="Unlisted" />
          <SelectItem value="private" text="Followers only" />
          <SelectItem value="direct" text="Direct message" />
        </Select>

        <Toggle
          id="advanced-visibilities"
          labelText="Advanced post visibilities"
          labelA="Off"
          labelB="On"
          toggled={settings.showAdvancedVisibilities}
          onToggle={(checked) => updateSettings({ showAdvancedVisibilities: checked })}
        />

        <TextArea
          id="custom-css"
          labelText="Custom CSS"
          helperText="Inject your own CSS to locally skin the forum. Rules are scoped to the app; @import and remote url() values are removed."
          placeholder="body { font-family: monospace; }"
          value={settings.customCss}
          onChange={(e) => updateSettings({ customCss: e.target.value })}
          rows={4}
        />
        {cssWarning && (
          <InlineNotification
            kind="warning"
            title="Custom CSS adjusted"
            subtitle={cssWarning}
            lowContrast
            hideCloseButton
          />
        )}
        {settings.customCss && (
          <Button
            kind="ghost"
            size="sm"
            onClick={() => updateSettings({ customCss: '' })}
          >
            Clear custom CSS
          </Button>
        )}
            </div>
          </TabPanel>
          {credentials && (
            <TabPanel>
              <div style={{ paddingTop: '1rem' }}>
                <FiltersPanel />
              </div>
            </TabPanel>
          )}
        </TabPanels>
      </Tabs>
    </Modal>
  );
}
