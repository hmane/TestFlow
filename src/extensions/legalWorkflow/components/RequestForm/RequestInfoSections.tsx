import * as React from 'react';
import { Icon, Separator, Stack, Text, Spinner, SpinnerSize } from '@fluentui/react';
import { SelectBox } from 'devextreme-react/select-box';
import { Controller, FieldErrors, useFormContext } from 'react-hook-form';

import {
  FormContainer,
  FormItem,
  FormLabel,
  PnPPeoplePicker,
} from 'spfx-toolkit/lib/components/spForm';
import {
  SPChoiceField,
  SPChoiceDisplayType,
  SPDateField,
  SPDateTimeFormat,
  SPTextField,
  SPTextFieldMode,
} from 'spfx-toolkit/lib/components/spFields';
import { SPContext } from 'spfx-toolkit';

import { Lists } from '@sp/Lists';

import type { ILegalRequest } from '@appTypes/index';
import { DistributionMethod, RequestType, ReviewAudience, SubmissionType } from '@appTypes/index';
import { PriorSubmissionPicker } from '@components/PriorSubmissionPicker/PriorSubmissionPicker';
import { useSubmissionItems } from '@stores/submissionItemsStore';

const SECTION_HEADER_TOKENS = { childrenGap: 4 };
const SECTION_HEADER_INNER_TOKENS = { childrenGap: 12 };
const SECTION_ICON_STYLES = { root: { fontSize: '20px', color: '#0078d4' } };
const SECTION_TITLE_STYLES = { root: { fontWeight: 600 as const, color: '#323130' } };
const SECTION_DESC_STYLES = { root: { color: '#605e5c' } };

const SUBMISSION_TYPE_CHOICES: SubmissionType[] = [
  SubmissionType.New,
  SubmissionType.MaterialUpdates,
];

const REVIEW_AUDIENCE_CHOICES: ReviewAudience[] = [
  ReviewAudience.Legal,
  ReviewAudience.Compliance,
  ReviewAudience.Both,
];

const DISTRIBUTION_METHOD_CHOICES: DistributionMethod[] = [
  DistributionMethod.DodgeCoxWebsiteUS,
  DistributionMethod.DodgeCoxWebsiteNonUS,
  DistributionMethod.ThirdPartyWebsite,
  DistributionMethod.EmailMail,
  DistributionMethod.MobileApp,
  DistributionMethod.DisplayCardSignage,
  DistributionMethod.Hangout,
  DistributionMethod.LiveTalkingPoints,
  DistributionMethod.SocialMedia,
];


interface SectionHeaderProps {
  icon: string;
  title: string;
  description: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, description }) => (
  <Stack tokens={SECTION_HEADER_TOKENS}>
    <Stack horizontal verticalAlign='center' tokens={SECTION_HEADER_INNER_TOKENS}>
      <Icon iconName={icon} styles={SECTION_ICON_STYLES} />
      <Text variant='xLarge' styles={SECTION_TITLE_STYLES}>
        {title}
      </Text>
    </Stack>
    <Text variant='small' styles={SECTION_DESC_STYLES}>
      {description}
    </Text>
  </Stack>
);

interface BasicInfoSectionProps {
  errors: FieldErrors<ILegalRequest>;
  hasSubmissionItemSelection: boolean;
  calculatedIsRush: boolean;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  errors,
  hasSubmissionItemSelection,
  calculatedIsRush,
}) => {
  const { control } = useFormContext<ILegalRequest>();
  const requestListIdentifier = Lists.Requests.Title; //React.useMemo(() => getRequestListIdentifier(), []);
  const { items: submissionItems, isLoading: isLoadingSubmissionItems, error: submissionItemsError } = useSubmissionItems();

  // Track if "Other" is selected
  const [isOtherSelected, setIsOtherSelected] = React.useState(false);

  return (
    <>
      <SectionHeader
        icon='Info'
        title='Basic Information'
        description='Provide essential details about your request'
      />

      <Separator />

      <FormContainer labelWidth='200px'>
        <FormItem fieldName='requestTitle'>
          <FormLabel isRequired>Request Title</FormLabel>
          <SPTextField
            name='requestTitle'
            placeholder='Enter a descriptive title for your request'
            mode={SPTextFieldMode.SingleLine}
            maxLength={255}
            showCharacterCount
            stylingMode='outlined'
            rules={{
              required: 'Request title is required',
              minLength: { value: 3, message: 'Request title must be at least 3 characters' },
              maxLength: { value: 255, message: 'Request title cannot exceed 255 characters' },
            }}
          />
        </FormItem>

        <FormItem fieldName='purpose'>
          <FormLabel isRequired>Purpose</FormLabel>
          <SPTextField
            name='purpose'
            placeholder='Describe the purpose of this request in detail'
            mode={SPTextFieldMode.MultiLine}
            rows={4}
            maxLength={1000}
            showCharacterCount
            stylingMode='outlined'
            rules={{
              required: 'Purpose is required',
              minLength: { value: 10, message: 'Purpose must be at least 10 characters' },
              maxLength: { value: 1000, message: 'Purpose cannot exceed 1000 characters' },
            }}
          />
        </FormItem>

        <FormItem fieldName='submissionType'>
          <FormLabel isRequired>Submission Type</FormLabel>
          <SPChoiceField
            name='submissionType'
            placeholder='Select submission type'
            displayType={SPChoiceDisplayType.Dropdown}
            choices={SUBMISSION_TYPE_CHOICES}
            dataSource={{
              type: 'list',
              listNameOrId: requestListIdentifier,
              fieldInternalName: 'SubmissionType',
            }}
            showClearButton
            rules={{
              required: 'Submission type is required',
            }}
          />
        </FormItem>

        <FormItem fieldName='submissionItem'>
          <FormLabel isRequired>Submission Item</FormLabel>
          <Controller
            name='submissionItem'
            control={control}
            rules={{ required: 'Submission Item is required' }}
            render={({ field, fieldState }) => (
              <Stack tokens={{ childrenGap: 8 }}>
                {isLoadingSubmissionItems && (
                  <Spinner size={SpinnerSize.small} label="Loading submission items..." />
                )}
                {submissionItemsError && (
                  <Text variant='small' styles={{ root: { color: '#d13438' } }}>
                    Error loading submission items: {submissionItemsError}
                  </Text>
                )}
                {!isLoadingSubmissionItems && !submissionItemsError && (
                  <SelectBox
                    dataSource={submissionItems}
                    displayExpr='title'
                    valueExpr='title'
                    value={field.value}
                    onValueChanged={(e) => {
                      const selectedValue = e.value;
                      field.onChange(selectedValue);
                      setIsOtherSelected(selectedValue === 'Other');
                    }}
                    placeholder='Select submission item'
                    searchEnabled={true}
                    showClearButton={true}
                    stylingMode='outlined'
                    disabled={submissionItems.length === 0}
                    isValid={!fieldState.error}
                    validationError={fieldState.error ? { message: fieldState.error.message } : undefined}
                  />
                )}
              </Stack>
            )}
          />
        </FormItem>

        <FormItem fieldName='submissionItemOther' style={{ display: isOtherSelected ? 'block' : 'none' }}>
          <FormLabel isRequired>Specify Other Submission Item</FormLabel>
          <SPTextField
            name='submissionItemOther'
            placeholder='Please specify the submission item'
            mode={SPTextFieldMode.SingleLine}
            maxLength={255}
            showCharacterCount
            stylingMode='outlined'
            rules={{ required: isOtherSelected ? 'Please specify the submission item when selecting Other' : false }}
          />
        </FormItem>

        <FormItem fieldName='targetReturnDate'>
          <FormLabel isRequired>Target Return Date</FormLabel>
          <SPDateField
            name='targetReturnDate'
            placeholder='Select target return date'
            dateTimeFormat={SPDateTimeFormat.DateOnly}
            displayFormat='MM/dd/yyyy'
            showClearButton
            disabled={!hasSubmissionItemSelection}
            rules={{
              required: 'Target return date is required',
            }}
          />
          {!hasSubmissionItemSelection && (
            <Text variant='small' styles={{ root: { color: '#605e5c', marginTop: '4px' } }}>
              Please select a submission item first
            </Text>
          )}
        </FormItem>

        <FormItem fieldName='rushRationale' style={{ display: calculatedIsRush ? 'block' : 'none' }}>
          <FormLabel isRequired>Rush Rationale</FormLabel>
          <SPTextField
            name='rushRationale'
            placeholder='This is a rush request based on the turnaround time. Please explain why this deadline is necessary.'
            mode={SPTextFieldMode.MultiLine}
            rows={3}
            maxLength={500}
            showCharacterCount
            stylingMode='outlined'
            rules={{
              required: calculatedIsRush ? 'Rush rationale is required for rush requests' : false,
              maxLength: { value: 500, message: 'Rush rationale cannot exceed 500 characters' },
            }}
          />
          <Text variant='small' styles={{ root: { color: '#d13438', marginTop: '4px' } }}>
            ⚠️ Rush request: Target date is sooner than standard turnaround time
          </Text>
        </FormItem>
      </FormContainer>
    </>
  );
};

interface DistributionAudienceSectionProps {
  errors: FieldErrors<ILegalRequest>;
  requestType?: RequestType;
}

export const DistributionAudienceSection: React.FC<DistributionAudienceSectionProps> = ({
  errors,
  requestType,
}) => {
  // Always call hooks first
  const requestListIdentifier = Lists.Requests.Title;
  const distributionChoices = React.useMemo(() => DISTRIBUTION_METHOD_CHOICES, []);

  // Determine if section should be visible
  const isVisible = requestType === RequestType.Communication;

  // Always render all fields to maintain consistent hook count
  return (
    <>
      <div style={{ display: isVisible ? 'block' : 'none' }}>
        <Separator />
        <SectionHeader
          icon='Megaphone'
          title='Distribution & Audience'
          description='Specify how and where this communication will be distributed'
        />
      </div>
      <FormContainer labelWidth='200px' style={{ display: isVisible ? 'block' : 'none' }}>
        <FormItem fieldName='reviewAudience'>
          <FormLabel isRequired={isVisible}>Review Audience</FormLabel>
          <SPChoiceField
            name='reviewAudience'
            placeholder='Select review audience'
            displayType={SPChoiceDisplayType.Dropdown}
            choices={REVIEW_AUDIENCE_CHOICES}
            dataSource={{
              type: 'list',
              listNameOrId: requestListIdentifier,
              fieldInternalName: 'ReviewAudience',
            }}
            showClearButton
            rules={{
              required: isVisible ? 'Review audience is required' : false,
            }}
          />
        </FormItem>

        <FormItem fieldName='distributionMethod'>
          <FormLabel>Distribution Method</FormLabel>
          <SPChoiceField
            name='distributionMethod'
            placeholder='Select one or more distribution methods'
            allowMultiple
            displayType={SPChoiceDisplayType.Checkboxes}
            choices={distributionChoices}
            dataSource={{
              type: 'list',
              listNameOrId: requestListIdentifier,
              fieldInternalName: 'DistributionMethod',
            }}
          />
        </FormItem>

        <FormItem fieldName='dateOfFirstUse'>
          <FormLabel>Date of First Use</FormLabel>
          <SPDateField
            name='dateOfFirstUse'
            placeholder='Select date of first use'
            dateTimeFormat={SPDateTimeFormat.DateOnly}
            displayFormat='MM/dd/yyyy'
            showClearButton
          />
        </FormItem>
      </FormContainer>
    </>
  );
};

interface PriorSubmissionsSectionProps {
  errors: FieldErrors<ILegalRequest>;
  priorSubmissions: ILegalRequest['priorSubmissions'] | undefined;
  onPriorSubmissionsChange: (value: ILegalRequest['priorSubmissions']) => void;
  isLoading: boolean;
  currentUserDepartment?: string;
}

export const PriorSubmissionsSection: React.FC<PriorSubmissionsSectionProps> = ({
  errors,
  priorSubmissions,
  onPriorSubmissionsChange,
  isLoading,
  currentUserDepartment,
}) => {
  return (
    <>
      <Separator />
      <SectionHeader
        icon='History'
        title='Prior Submissions'
        description='Reference any related prior submissions'
      />
      <FormContainer labelWidth='200px'>
        <FormItem fieldName='priorSubmissions'>
          <FormLabel>Prior Submissions</FormLabel>
          <PriorSubmissionPicker
            value={priorSubmissions || []}
            onChange={onPriorSubmissionsChange}
            disabled={isLoading}
            currentUserDepartment={currentUserDepartment}
            placeholder='Search by request ID, title, purpose, or submission item...'
          />
        </FormItem>

        <FormItem fieldName='priorSubmissionNotes'>
          <FormLabel>Prior Submission Notes</FormLabel>
          <SPTextField
            name='priorSubmissionNotes'
            placeholder='Add any notes about prior submissions'
            mode={SPTextFieldMode.MultiLine}
            rows={3}
            maxLength={1000}
            showCharacterCount
            stylingMode='outlined'
          />
        </FormItem>
      </FormContainer>
    </>
  );
};

interface AdditionalPartiesSectionProps {
  errors: FieldErrors<ILegalRequest>;
}

export const AdditionalPartiesSection: React.FC<AdditionalPartiesSectionProps> = ({
  errors,
}) => {
  const { control } = useFormContext<ILegalRequest>();

  return (
  <>
    <Separator />
    <SectionHeader
      icon='People'
      title='Additional Parties'
      description='Add other people who should be notified or involved'
    />
    <FormContainer labelWidth='200px'>
      <FormItem fieldName='additionalParty'>
        <FormLabel>Additional Parties</FormLabel>
        <PnPPeoplePicker
          name='additionalParty'
          control={control}
          context={SPContext.peoplepickerContext}
          placeholder='Search for people to add'
          personSelectionLimit={10}
          ensureUser={true}
        />
      </FormItem>
    </FormContainer>
  </>
  );
};
