import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator';

@ValidatorConstraint({ name: 'isCepRangeValid', async: false })
export class IsCepRangeValidConstraint implements ValidatorConstraintInterface {
  validate(cep_end: string, args: ValidationArguments) {
    const object = args.object as any;
    const cep_start = object.cep_start;

    if (!cep_start || !cep_end) return false;

    const start = parseInt(cep_start.replace(/\D/g, ''), 10);
    const end = parseInt(cep_end.replace(/\D/g, ''), 10);

    if (isNaN(start) || isNaN(end)) return false;

    if (start > end) return false;

    if (end - start > 1000) return false; 

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as any;
    const start = parseInt(object.cep_start.replace(/\D/g, ''));
    const end = parseInt(args.value.replace(/\D/g, ''));

    if (start > end) return 'cep_start cannot be greater than cep_end.';
    if (end - start > 1000) return 'The maximum allowed range is 1000 postal codes per request.';
    
    return 'Range de CEP inválido';
  }
}

export function IsCepRangeValid(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCepRangeValidConstraint,
    });
  };
}