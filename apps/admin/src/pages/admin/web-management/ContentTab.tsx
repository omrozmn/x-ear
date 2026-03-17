import React from 'react';
import type { EditableFieldDefinition, BuilderSectionRegistryResponse, SiteWorkspace } from '@/lib/website-generator-client';
import { SectionComposer } from './SectionComposer';
import { SectionLibrary } from './SectionLibrary';

export interface ContentTabProps {
    workspace: SiteWorkspace | null;
    selectedPage: SiteWorkspace['site']['pages'][number] | null;
    pages: SiteWorkspace['site']['pages'];
    setSelectedPageSlug: (slug: string) => void;
    editingSectionIndex: number | null;
    setEditingSectionIndex: (index: number | null) => void;
    sectionFieldsDraft: Record<string, unknown>;
    setSectionFieldsDraft: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
    sectionRegistry: BuilderSectionRegistryResponse | undefined;
    newSectionType: string;
    setNewSectionType: (type: string) => void;
    newSectionVariant: string;
    setNewSectionVariant: (variant: string) => void;
    availableSectionVariants: BuilderSectionRegistryResponse['sections'][number]['variants'];
    isBusy: (key: string) => boolean;
    getEditableFields: (sectionType: string, variantKey: string) => EditableFieldDefinition[];
    handleMoveSection: (sectionIndex: number, direction: 'up' | 'down') => void;
    handleDeleteSection: (sectionIndex: number) => void;
    handleSaveSectionContent: (sectionIndex: number, currentVariant: string) => void;
    handleAddSection: () => void;
}

export const ContentTab: React.FC<ContentTabProps> = ({
    selectedPage,
    pages,
    setSelectedPageSlug,
    editingSectionIndex,
    setEditingSectionIndex,
    sectionFieldsDraft,
    setSectionFieldsDraft,
    sectionRegistry,
    newSectionType,
    setNewSectionType,
    newSectionVariant,
    setNewSectionVariant,
    availableSectionVariants,
    isBusy,
    getEditableFields,
    handleMoveSection,
    handleDeleteSection,
    handleSaveSectionContent,
    handleAddSection,
}) => {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <SectionComposer
                selectedPage={selectedPage}
                pages={pages}
                setSelectedPageSlug={setSelectedPageSlug}
                editingSectionIndex={editingSectionIndex}
                setEditingSectionIndex={setEditingSectionIndex}
                sectionFieldsDraft={sectionFieldsDraft}
                setSectionFieldsDraft={setSectionFieldsDraft}
                getEditableFields={getEditableFields}
                handleMoveSection={handleMoveSection}
                handleDeleteSection={handleDeleteSection}
                handleSaveSectionContent={handleSaveSectionContent}
            />
            <SectionLibrary
                selectedPage={selectedPage}
                sectionRegistry={sectionRegistry}
                newSectionType={newSectionType}
                setNewSectionType={setNewSectionType}
                newSectionVariant={newSectionVariant}
                setNewSectionVariant={setNewSectionVariant}
                availableSectionVariants={availableSectionVariants}
                isBusy={isBusy}
                handleAddSection={handleAddSection}
            />
        </div>
    );
};
